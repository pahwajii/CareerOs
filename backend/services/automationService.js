import { chromium } from "playwright"
import fs from "fs"
import path from "path"
import User from "../models/User.js"
import Job from "../models/Job.js"
import TailoredResume from "../models/TailoredResume.js"
import aiOrchestrator from "./aiOrchestrator.js"

class AutomationService {
  /**
   * Main automation trigger. Generates resume/cover letter, launches headed browser, auto-fills form fields,
   * answers screening questions with Gemini Flash, and pauses for human inspection.
   */
  async runAutoApply(userId, jobId, onProgress) {
    let browser = null

    try {
      // 1. Load job and profile context
      onProgress("loading", "Fetching application contexts...")
      const job = await Job.findOne({ _id: jobId, user: userId })
      if (!job) throw new Error("Job application not found.")
      if (!job.url) throw new Error("Job application URL is missing.")

      const user = await User.findById(userId)
      if (!user) throw new Error("User not found.")

      // 2. Identify or generate tailored resume
      onProgress("resume", "Locating tailored resume PDF...")
      let resumePath = ""
      const tailored = await TailoredResume.findOne({ user: userId, job: jobId }).sort({ createdAt: -1 })
      
      if (tailored && tailored.pdfFileName) {
        resumePath = path.join("uploads", "tailored", tailored.pdfFileName)
      }

      // Fallback: If no tailored resume exists, check for raw resume PDF
      if (!resumePath || !fs.existsSync(resumePath)) {
        if (user.resumeFileName) {
          resumePath = path.join("uploads", "resumes", user.resumeFileName)
        }
      }

      if (!resumePath || !fs.existsSync(resumePath)) {
        onProgress("warning", "No resume PDF file found. Form filling will proceed without upload.")
      }

      // 3. Launch headed browser
      onProgress("browser", `Opening headed browser at: ${job.url}...`)
      browser = await chromium.launch({
        headless: false,
        args: ["--start-maximized"]
      })

      const context = await browser.newContext({ viewport: null })
      const page = await context.newPage()
      await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 45000 })

      // 4. Detect ATS platform
      onProgress("detecting", "Detecting ATS form configurations...")
      const url = job.url.toLowerCase()
      const content = await page.content()

      if (url.includes("greenhouse.io") || content.includes("greenhouse")) {
        onProgress("filling", "Prefilling Greenhouse application form...")
        await this.fillGreenhouse(page, user, resumePath)
      } else if (url.includes("lever.co") || content.includes("lever-app")) {
        onProgress("filling", "Prefilling Lever application form...")
        await this.fillLever(page, user, resumePath)
      } else if (url.includes("ashbyhq.com") || content.includes("ashby")) {
        onProgress("filling", "Prefilling Ashby application form...")
        await this.fillAshby(page, user, resumePath)
      } else if (url.includes("myworkdayjobs.com") || content.includes("workday")) {
        onProgress("filling", "Prefilling Workday application form...")
        await this.fillWorkday(page, user, resumePath)
      } else {
        onProgress("filling", "Prefilling application via Generic Heuristic form-filler...")
        await this.fillGeneric(page, user, resumePath)
      }

      // 5. Answer Screening Questions with AI
      onProgress("questions", "Answering additional screening questions with AI...")
      await this.fillCustomScreeningQuestions(page, user)

      // 6. Pause for manual review
      onProgress("paused", "Paused: Verify details and click Submit manually when ready.")

      // Wait for page/browser to close
      await new Promise((resolve) => {
        page.on("close", resolve)
        browser.on("disconnected", resolve)
      })

      // 7. Transition CRM status to applied
      job.status = "applied"
      // Add timeline event
      const hasAppliedEvent = job.timeline?.some(e => e.title.toLowerCase().includes("applied"))
      if (!hasAppliedEvent) {
        job.timeline.push({
          title: "Applied via Auto-Apply",
          date: new Date(),
          details: "Form details prefilled automatically using Playwright headed script."
        })
      }
      await job.save()

      return { success: true, message: "Application prefilled. Status moved to Applied." }
    } catch (error) {
      console.error("Automation error:", error)
      if (browser) await browser.close().catch(() => {})
      throw error
    }
  }

  /**
   * Greenhouse form locators
   */
  async fillGreenhouse(page, user, resumePath) {
    try {
      if (await page.locator("#first_name").count() > 0) await page.fill("#first_name", user.name.split(" ")[0])
      if (await page.locator("#last_name").count() > 0) await page.fill("#last_name", user.name.split(" ").slice(1).join(" ") || "Pahwa")
      if (await page.locator("#email").count() > 0) await page.fill("#email", user.email)
      if (await page.locator("#phone").count() > 0) await page.fill("#phone", user.phone || "+1 555 0199")

      // LinkedIn, GitHub, Portfolio website links mapping
      const linkedin = page.locator('input[id*="linkedin"], input[name*="linkedin"], input[id*="url_0"]')
      if (await linkedin.count() > 0) await linkedin.first().fill(user.codingProfiles?.linkedin || "")

      const github = page.locator('input[id*="github"], input[name*="github"], input[id*="url_1"]')
      if (await github.count() > 0) await github.first().fill(user.codingProfiles?.github || "")

      const portfolio = page.locator('input[id*="portfolio"], input[name*="portfolio"], input[id*="website"]')
      if (await portfolio.count() > 0) await portfolio.first().fill(user.codingProfiles?.portfolio || "")

      // Resume file upload
      if (resumePath && fs.existsSync(resumePath)) {
        const fileInput = page.locator('input[type="file"][id*="resume"], input[type="file"]')
        if (await fileInput.count() > 0) {
          await fileInput.first().setInputFiles(resumePath)
        }
      }
    } catch (e) {
      console.error("Greenhouse prefill failure:", e)
    }
  }

  /**
   * Lever form locators
   */
  async fillLever(page, user, resumePath) {
    try {
      if (await page.locator('input[name="name"]').count() > 0) await page.fill('input[name="name"]', user.name)
      if (await page.locator('input[name="email"]').count() > 0) await page.fill('input[name="email"]', user.email)
      if (await page.locator('input[name="phone"]').count() > 0) await page.fill('input[name="phone"]', user.phone || "+1 555 0199")
      if (await page.locator('input[name="org"]').count() > 0) await page.fill('input[name="org"]', "")

      if (await page.locator('input[name="urls[LinkedIn]"]').count() > 0) {
        await page.fill('input[name="urls[LinkedIn]"]', user.codingProfiles?.linkedin || "")
      }
      if (await page.locator('input[name="urls[GitHub]"]').count() > 0) {
        await page.fill('input[name="urls[GitHub]"]', user.codingProfiles?.github || "")
      }
      if (await page.locator('input[name="urls[Portfolio]"]').count() > 0) {
        await page.fill('input[name="urls[Portfolio]"]', user.codingProfiles?.portfolio || "")
      }

      if (resumePath && fs.existsSync(resumePath)) {
        const fileInput = page.locator('input[type="file"]')
        if (await fileInput.count() > 0) {
          await fileInput.first().setInputFiles(resumePath)
        }
      }
    } catch (e) {
      console.error("Lever prefill failure:", e)
    }
  }

  /**
   * Ashby form locators
   */
  async fillAshby(page, user, resumePath) {
    // Ashby forms follow a simple label structure. We fallback to heuristic fillers.
    await this.fillGeneric(page, user, resumePath)
  }

  /**
   * Workday form locators
   */
  async fillWorkday(page, user, resumePath) {
    // Workday applications are heavily dynamic and divided into multiple signin steps.
    // We fill fields heuristically on the current active view page.
    await this.fillGeneric(page, user, resumePath)
  }

  /**
   * Generic Heuristic Form Filler matching label configurations
   */
  async fillGeneric(page, user, resumePath) {
    try {
      const inputs = await page.locator("input, textarea").all()
      for (const input of inputs) {
        const type = await input.getAttribute("type")
        if (["submit", "button", "checkbox", "radio", "hidden"].includes(type)) continue

        const id = (await input.getAttribute("id") || "").toLowerCase()
        const name = (await input.getAttribute("name") || "").toLowerCase()
        const placeholder = (await input.getAttribute("placeholder") || "").toLowerCase()

        let labelText = ""
        if (id) {
          const label = page.locator(`label[for="${id}"]`)
          if (await label.count() > 0) {
            labelText = (await label.innerText() || "").toLowerCase()
          }
        }

        const combined = `${id} ${name} ${placeholder} ${labelText}`

        if (type === "file" && (combined.includes("resume") || combined.includes("cv"))) {
          if (resumePath && fs.existsSync(resumePath)) {
            await input.setInputFiles(resumePath)
          }
        } else if (combined.includes("first name") || combined.includes("given name")) {
          await input.fill(user.name.split(" ")[0])
        } else if (combined.includes("last name") || combined.includes("family name")) {
          await input.fill(user.name.split(" ").slice(1).join(" ") || "Pahwa")
        } else if (combined.includes("name") && !combined.includes("company") && !combined.includes("school")) {
          await input.fill(user.name)
        } else if (combined.includes("email")) {
          await input.fill(user.email)
        } else if (combined.includes("phone") || combined.includes("mobile")) {
          await input.fill(user.phone || "+1 555 0199")
        } else if (combined.includes("linkedin")) {
          await input.fill(user.codingProfiles?.linkedin || "")
        } else if (combined.includes("github")) {
          await input.fill(user.codingProfiles?.github || "")
        } else if (combined.includes("portfolio") || combined.includes("website")) {
          await input.fill(user.codingProfiles?.portfolio || "")
        }
      }
    } catch (e) {
      console.error("Generic form prefill failure:", e)
    }
  }

  /**
   * Scans textareas for custom screening questions and answers them using Gemini Flash
   */
  async fillCustomScreeningQuestions(page, user) {
    try {
      const textareas = await page.locator("textarea").all()
      for (const area of textareas) {
        const val = await area.inputValue()
        if (val.trim() === "") {
          const id = await area.getAttribute("id")
          let question = ""
          
          if (id) {
            const label = page.locator(`label[for="${id}"]`)
            if (await label.count() > 0) question = await label.innerText()
          }
          if (!question) {
            question = await area.getAttribute("placeholder") || await area.getAttribute("name") || ""
          }

          if (question.trim().length > 8 && !question.toLowerCase().includes("notes") && !question.toLowerCase().includes("resume")) {
            console.log(`AI question detected: "${question}"`)
            const answer = await this.generateAIAnswer(question, user)
            await area.fill(answer)
            // Visual delay to feel premium
            await page.waitForTimeout(500)
          }
        }
      }
    } catch (e) {
      console.error("Custom questions fill failure:", e)
    }
  }

  /**
   * Invokes Gemini Flash to write brief 2-sentence screening replies
   */
  async generateAIAnswer(question, user) {
    const profileText = `
Name: ${user.name}
Bio: ${user.bio}
Skills: ${user.skills?.join(", ")}
Experience Summary: ${user.experience?.map(e => `${e.role} at ${e.company}`).join(", ")}
`
    const prompt = `
You are a job applicant filling a career form.
Write a concise, professional 2-sentence response answering this screening question: "${question}".
Use details from my profile payload:
${profileText}

Be brief, realistic, and do not invent metrics. Output ONLY the response text.
`
    const messages = [{ role: "user", content: prompt }]
    try {
      const answer = await aiOrchestrator.execute("profile-building", messages)
      return answer.trim()
    } catch (err) {
      console.error("Gemini failed answering screening question:", err)
      return "Highly motivated software engineer with experience matching target technical skillsets."
    }
  }
}

export default new AutomationService()
