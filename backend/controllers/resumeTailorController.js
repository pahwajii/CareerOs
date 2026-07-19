import fs from "fs"
import path from "path"
import mongoose from "mongoose"
import User from "../models/User.js"
import Job from "../models/Job.js"
import TailoredResume from "../models/TailoredResume.js"
import aiOrchestrator from "../services/aiOrchestrator.js"
import { ResumeContentSchema } from "../templates/resumeContentSchema.js"
import { buildResumeHtml } from "../templates/resumeTemplate.js"
import { buildResumeLatex } from "../templates/resumeLatexTemplate.js"
import { renderHtmlToPdf, renderHtmlToDocx } from "../services/resumeRenderer.js"

/**
 * Trigger AI Resume Tailoring pipeline using LaTeX Ground-Truth template
 * POST /api/resume/tailor
 */
export async function tailorResume(req, res, next) {
  const { jobId, useModel } = req.body

  try {
    if (!jobId) {
      return res.status(400).json({ message: "jobId is required for tailoring." })
    }

    // Defense-in-depth shell injection surface safety check
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid jobId format. Must be a valid MongoDB ObjectId." })
    }

    const job = await Job.findOne({ _id: jobId, user: req.userId })
    if (!job) {
      return res.status(404).json({ message: "Target job application not found." })
    }

    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: "User not found." })
    }

    const profilePayload = {
      name: user.name,
      phone: user.phone,
      headline: user.headline,
      bio: user.bio,
      skills: user.skills,
      education: user.education,
      experience: user.experience,
      projects: user.projects,
      certifications: user.certifications
    }

    const prompt = `
You are an expert ATS resume optimizer.

You will be given:
1. The user's Master Career Profile (JSON) — the full, factual source of truth for their experience.
2. A Target Job Description.

Your task: produce a structured JSON object containing a content-tailored version of the user's profile, optimized for the Target Job Description.

═══════════════════════════════════════════
CONTENT RULES — WHAT YOU MAY CHANGE
═══════════════════════════════════════════
- Headline tagline: adapt to mirror the target role's title/keywords.
- Technical Skills: reorder rows/values and select which skills are surfaced (from the user's actual skills only) to match JD keywords. Do not invent skills or tools not present in the Master Career Profile.
- Work Experience: you may reorder bullets within a role by relevance, rewrite bullet phrasing for impact and JD-keyword alignment, and bold key technologies (using **text** format) — but max 4 bullets per role, and every bullet must trace back to something factually present in the profile. Never invent metrics, technologies, or responsibilities.
- Projects: select and order projects by relevance to the JD; rewrite bullets the same way as Work Experience. Max 3 bullets per project.
- Achievements & Certifications: reorder/trim by relevance; do not invent credentials. Use **text** format for bold emphasis if needed.

Factual correctness is mandatory. Only rephrase, restructure, reorder, or select from EXISTING items in the Master Career Profile. Never fabricate experience, skills, metrics, or credentials.

═══════════════════════════════════════════
USER MASTER CAREER PROFILE (JSON)
═══════════════════════════════════════════
${JSON.stringify(profilePayload)}

═══════════════════════════════════════════
TARGET JOB
═══════════════════════════════════════════
Company: ${job.company}
Position: ${job.role}
Job Description:
${job.jobDescription}

═══════════════════════════════════════════
OUTPUT
═══════════════════════════════════════════
Return a single JSON object with these fields:
1. "tailoredContent": an object with this exact shape:
   {
     "headline": string,
     "skills": [{ "category": string, "items": string }],
     "experience": [{ "title": string, "dateRange": string, "bullets": [string] }],
     "projects": [{ "title": string, "dateRange": string, "techStack": string, "bullets": [string] }],
     "achievements": [string]
   }
   Use **text** for bold emphasis within bullets/achievements where useful.
   Max 4 bullets per experience entry, max 3 per project. Keep bullets short enough for the combined content to fit one A4 page.
2. "atsScore": integer 0-100.
3. "keywordCoverage": array of strings.
4. "missingSkills": array of strings.
5. "suggestions": array of strings.

Return ONLY valid raw JSON. Do not include markdown code fences.
`
    const messages = [
      { role: "system", content: "You are a precise resume parser returning raw JSON." },
      { role: "user", content: prompt }
    ]

    console.log(`AI Resume Tailor: Invoking ${useModel || "default"} model...`)
    const rawResponse = await aiOrchestrator.execute("resume-tailoring", messages, 0.2, useModel)
    
    let cleaned = rawResponse.trim()
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "").trim()
    }

    let parsed
    try {
      const sanitized = cleaned.replace(/(?:\\u[0-9a-fA-F]{4}|\\["\\/bfnrtu])|(\\)/g, (match, g1) => {
        return g1 ? "\\\\" : match
      })
      parsed = JSON.parse(sanitized)
    } catch (parseError) {
      console.error("Failed to parse AI resume tailoring response:", cleaned, parseError)
      return res.status(500).json({
        message: "Failed to parse AI tailoring response. Please try again.",
        rawResponse
      })
    }

    // Validate schema
    const validation = ResumeContentSchema.safeParse(parsed.tailoredContent)
    if (!validation.success) {
      console.error("AI response failed schema validation:", validation.error.format())
      return res.status(500).json({
        message: "AI response did not match the expected resume content structure.",
        rawResponse
      })
    }

    const html = buildResumeHtml(validation.data, user)
    const latex = buildResumeLatex(validation.data, user)

    const timestamp = Date.now()
    const dir = path.join("uploads", "tailored")
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const pdfFileName = `${req.userId}_${jobId}_${timestamp}.pdf`
    const docxFileName = `${req.userId}_${jobId}_${timestamp}.docx`
    const texFileName = `${req.userId}_${jobId}_${timestamp}.tex`

    const pdfPath = path.join(dir, pdfFileName)
    const docxPath = path.join(dir, docxFileName)
    const texPath = path.join(dir, texFileName)

    // Generate LaTeX source file
    let texSuccess = false
    try {
      fs.writeFileSync(texPath, latex)
      texSuccess = true
    } catch (texError) {
      console.warn("LaTeX generation failed, continuing without it:", texError.message)
    }

    // Generate PDF file via Puppeteer
    let pdfSuccess = false
    try {
      await renderHtmlToPdf(html, pdfPath)
      pdfSuccess = true
    } catch (pdfError) {
      // Log but do NOT abort — save the record so the user sees output.
      // PDF may fail on environments without headless Chrome (e.g. fresh Render deploy).
      console.error("PDF rendering failed (continuing without PDF):", pdfError.message)
    }

    // Generate DOCX file via html-to-docx
    let docxSuccess = false
    try {
      await renderHtmlToDocx(html, docxPath)
      docxSuccess = true
    } catch (docxError) {
      console.warn("DOCX rendering failed, continuing without it:", docxError.message)
    }

    // Store in TailoredResume collection
    const tailored = new TailoredResume({
      user: req.userId,
      job: jobId,
      company: job.company,
      position: job.role,
      tailoredText: JSON.stringify(validation.data),
      atsScore: parsed.atsScore || 50,
      keywordCoverage: parsed.keywordCoverage || [],
      missingSkills: parsed.missingSkills || [],
      suggestions: parsed.suggestions || [],
      pdfFileName,
      docxFileName: docxSuccess ? docxFileName : "",
      texFileName: texSuccess ? texFileName : "",
      modelUsed: useModel || "gpt-5.6-sol",
      pdfCompiled: pdfSuccess
    })

    await tailored.save()
    res.json(tailored)
  } catch (error) {
    next(error)
  }
}

/**
 * Fetch list of tailored resume histories for a job
 * GET /api/resume/tailor/:jobId
 */
export async function getTailoredHistories(req, res, next) {
  const { jobId } = req.params

  try {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid jobId format." })
    }

    const histories = await TailoredResume.find({
      user: req.userId,
      job: jobId
    }).sort({ createdAt: -1 })

    res.json(histories)
  } catch (error) {
    next(error)
  }
}

/**
 * Download tailored PDF file
 * GET /api/resume/download/pdf/:id
 */
export async function downloadPdf(req, res, next) {
  const { id } = req.params

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid document ID format." })
    }

    const tailored = await TailoredResume.findOne({ _id: id, user: req.userId })
    if (!tailored || !tailored.pdfFileName) {
      return res.status(404).json({ message: "PDF document not found." })
    }

    const filePath = path.join("uploads", "tailored", tailored.pdfFileName)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Physical PDF file missing from disk." })
    }

    res.download(filePath, `${tailored.company.replace(/\s+/g, "_")}_Tailored_Resume.pdf`)
  } catch (error) {
    next(error)
  }
}

/**
 * Download tailored DOCX file
 * GET /api/resume/download/docx/:id
 */
export async function downloadDocx(req, res, next) {
  const { id } = req.params

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid document ID format." })
    }

    const tailored = await TailoredResume.findOne({ _id: id, user: req.userId })
    if (!tailored || !tailored.docxFileName) {
      return res.status(404).json({ message: "DOCX document not found. Pandoc is required on the server to generate DOCX resumes." })
    }

    const filePath = path.join("uploads", "tailored", tailored.docxFileName)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Physical DOCX file missing from disk." })
    }

    res.download(filePath, `${tailored.company.replace(/\s+/g, "_")}_Tailored_Resume.docx`)
  } catch (error) {
    next(error)
  }
}

/**
 * Download tailored LaTeX (.tex) file
 * GET /api/resume/download/tex/:id
 */
export async function downloadTex(req, res, next) {
  const { id } = req.params

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid document ID format." })
    }

    const tailored = await TailoredResume.findOne({ _id: id, user: req.userId })
    if (!tailored || !tailored.texFileName) {
      return res.status(404).json({ message: "LaTeX document not found." })
    }

    const filePath = path.join("uploads", "tailored", tailored.texFileName)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Physical LaTeX file missing from disk." })
    }

    res.download(filePath, `${tailored.company.replace(/\s+/g, "_")}_Tailored_Resume.tex`)
  } catch (error) {
    next(error)
  }
}
