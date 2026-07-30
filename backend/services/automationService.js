import { chromium } from "playwright"
import fs from "fs"
import path from "path"
import User from "../models/User.js"
import Job from "../models/Job.js"
import TailoredResume from "../models/TailoredResume.js"
import aiOrchestrator from "./aiOrchestrator.js"
import { isOmniRouteConfigured } from "../config/aiGateway.js"

function getExistingUploadPath(folder, ...fileNames) {
  for (const fileName of fileNames) {
    if (!fileName) continue
    const candidatePath = path.resolve("uploads", folder, path.basename(fileName))
    if (fs.existsSync(candidatePath)) return candidatePath
  }
  return ""
}

function getTailoredResumePath(tailored) {
  return getExistingUploadPath("tailored", tailored?.pdfFileName)
}

function getProfileResumePath(user) {
  return getExistingUploadPath("resumes", user.resumeFileName, `${user._id}_resume.pdf`)
}

function isTailoredResumePath(resumePath) {
  return resumePath.includes(path.resolve("uploads", "tailored"))
}

class AutomationService {
  async buildAutoApplyPlan(userId, jobId) {
    const job = await Job.findOne({ _id: jobId, user: userId })
    if (!job) throw new Error("Job application not found.")

    const user = await User.findById(userId)
    if (!user) throw new Error("User not found.")

    const tailored = await TailoredResume.findOne({ user: userId, job: jobId }).sort({ createdAt: -1 })
    const tailoredResumePath = getTailoredResumePath(tailored)
    const rawResumePath = getProfileResumePath(user)
    const resumePath = tailoredResumePath || rawResumePath

    const warnings = []
    const blockers = []

    if (!job.url) blockers.push("Add a job listing URL before launching auto-apply.")
    if (!user.name) blockers.push("Add your full name in the master profile.")
    if (!user.email) blockers.push("Add your email in the master profile.")
    if (!resumePath) warnings.push("No resume PDF was found. The workflow can still fill text fields, but it will not upload a resume.")
    if (!user.phone) warnings.push("Phone number is missing from the master profile.")
    if (!user.codingProfiles?.linkedin && !user.profileLinks?.linkedin) warnings.push("LinkedIn URL is missing from the master profile.")
    if (!job.jobDescription) warnings.push("Job description is empty, so AI answers will use only your profile.")
    if (!isOmniRouteConfigured()) warnings.push("OmniRoute is not configured. The AI step will fall back to the configured non-OmniRoute gateway if available.")

    return {
      job: {
        id: job._id,
        company: job.company,
        role: job.role,
        url: job.url,
        ats: this.detectAtsFromText(job.url || "")
      },
      readiness: {
        canLaunch: blockers.length === 0,
        blockers,
        warnings,
        resume: resumePath
          ? {
              available: true,
              source: isTailoredResumePath(resumePath) ? "tailored" : "profile",
              fileName: path.basename(resumePath)
            }
          : { available: false, source: "", fileName: "" },
        aiGateway: isOmniRouteConfigured() ? "OmniRoute" : "Fallback gateway"
      },
      steps: [
        "Load job, profile, and latest tailored resume.",
        "Open the listing in a headed browser window.",
        "Detect ATS platform and choose the best field-filling strategy.",
        "Fill contact details, profile links, and resume upload fields.",
        "Use the AI gateway to draft short screening-question answers.",
        "Pause for your review. You make the final submit decision.",
        "After the browser closes, move the job to Applied and add a timeline event."
      ]
    }
  }

  detectAtsFromText(text) {
    const value = text.toLowerCase()
    if (value.includes("greenhouse.io") || value.includes("greenhouse")) return "Greenhouse"
    if (value.includes("lever.co") || value.includes("lever-app")) return "Lever"
    if (value.includes("ashbyhq.com") || value.includes("ashby")) return "Ashby"
    if (value.includes("myworkdayjobs.com") || value.includes("workday")) return "Workday"
    return "Generic"
  }

  /**
   * Main automation trigger. Generates resume/cover letter, launches headed browser, auto-fills form fields,
   * answers screening questions with Gemini Flash, and pauses for human inspection.
   */
  async runAutoApply(userId, jobId, onProgress) {
    let context = null
    let browser = null


    try {
      // 1. Load job and profile context
      onProgress("loading", "Fetching application contexts...")
      const plan = await this.buildAutoApplyPlan(userId, jobId)
      if (!plan.readiness.canLaunch) {
        throw new Error(plan.readiness.blockers.join(" "))
      }

      const job = await Job.findOne({ _id: jobId, user: userId })
      if (!job) throw new Error("Job application not found.")
      if (!job.url) throw new Error("Job application URL is missing.")

      const user = await User.findById(userId)
      if (!user) throw new Error("User not found.")

      // 2. Identify or generate tailored resume
      onProgress("resume", "Locating tailored resume PDF...")
      const tailored = await TailoredResume.findOne({ user: userId, job: jobId }).sort({ createdAt: -1 })
      let resumePath = getTailoredResumePath(tailored) || getProfileResumePath(user)

      if (!resumePath || !fs.existsSync(resumePath)) {
        onProgress("warning", "No resume PDF file found. Form filling will proceed without upload.")
      }

      // 3. Launch stealth persistent browser (Prioritizing Brave Browser if available)
      onProgress("browser", `Opening stealth browser window at: ${job.url}...`)

      const bravePath = getBravePath()
      const launchOptions = {
        headless: false,
        ignoreDefaultArgs: ["--enable-automation"],
        args: [
          "--start-maximized",
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
          "--disable-setuid-sandbox"
        ]
      }

      if (bravePath) {
        console.log(`🚀 Playwright: Launching Brave Browser directly from ${bravePath}`)
        try {
          browser = await chromium.launch({
            ...launchOptions,
            executablePath: bravePath
          })
          context = await browser.newContext({ viewport: null })
          onProgress("browser", "Launched Brave Browser window!")
        } catch (err) {
          console.warn("Direct Brave launch failed, falling back to system Chrome:", err.message)
        }
      }

      // Fallback: System Chrome / Bundled Chromium
      if (!browser) {
        try {
          browser = await chromium.launch({
            ...launchOptions,
            channel: "chrome"
          })
          context = await browser.newContext({ viewport: null })
          onProgress("browser", "Launched Chrome Browser window!")
        } catch (chromeErr) {
          browser = await chromium.launch(launchOptions)
          context = await browser.newContext({ viewport: null })
          onProgress("browser", "Launched default Chromium window!")
        }
      }

      const page = await context.newPage()

      // Override navigator.webdriver to prevent site detection
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      })

      await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 45000 })

      // 4. Detect ATS platform
      onProgress("detecting", "Detecting ATS form configurations...")
      const url = job.url.toLowerCase()
      const content = await page.content()

      if (this.detectAtsFromText(`${url} ${content}`) === "Greenhouse") {
        onProgress("filling", "Prefilling Greenhouse application form...")
        await this.fillGreenhouse(page, user, resumePath)
      } else if (this.detectAtsFromText(`${url} ${content}`) === "Lever") {
        onProgress("filling", "Prefilling Lever application form...")
        await this.fillLever(page, user, resumePath)
      } else if (this.detectAtsFromText(`${url} ${content}`) === "Ashby") {
        onProgress("filling", "Prefilling Ashby application form...")
        await this.fillAshby(page, user, resumePath)
      } else if (this.detectAtsFromText(`${url} ${content}`) === "Workday") {
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
        if (browser) browser.on("disconnected", resolve)
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

      if (browser) await browser.close().catch(() => {})

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

function getBravePath() {
  const possiblePaths = [
    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    path.join(process.env.LOCALAPPDATA || "", "BraveSoftware", "Brave-Browser", "Application", "brave.exe")
  ]
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p
  }
  return null
}

export default new AutomationService()
