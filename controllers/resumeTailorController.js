import fs from "fs"
import path from "path"
import PDFDocument from "pdfkit"
import { Document, Packer, Paragraph, TextRun } from "docx"
import User from "../models/User.js"
import Job from "../models/Job.js"
import TailoredResume from "../models/TailoredResume.js"
import aiOrchestrator from "../services/aiOrchestrator.js"

/**
 * Helper to write a clean PDF document
 */
function generatePdfFile(filePath, contentText, name, title) {
  const doc = new PDFDocument({ margin: 50 })
  const writeStream = fs.createWriteStream(filePath)
  doc.pipe(writeStream)

  // Header Title
  doc.fontSize(22).fillColor("#1e1b4b").text(name, { align: "center" })
  if (title) {
    doc.fontSize(12).fillColor("#475569").text(title, { align: "center" })
  }
  doc.moveDown(1.5)

  // Split lines and render body
  const lines = contentText.split("\n")
  lines.forEach(line => {
    const trimmed = line.trim()
    if (trimmed.startsWith("###")) {
      doc.moveDown(0.5)
      doc.fontSize(12).fillColor("#1e1b4b").text(trimmed.replace(/^###\s*/, ""), { bold: true })
    } else if (trimmed.startsWith("##")) {
      doc.moveDown(0.8)
      doc.fontSize(14).fillColor("#1e1b4b").text(trimmed.replace(/^##\s*/, ""), { bold: true })
    } else if (trimmed.startsWith("#")) {
      doc.moveDown(1)
      doc.fontSize(16).fillColor("#1e1b4b").text(trimmed.replace(/^#\s*/, ""), { bold: true })
    } else if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
      doc.fontSize(10).fillColor("#334155").text(`  •  ${trimmed.replace(/^[-*]\s*/, "")}`, { lineGap: 3 })
    } else if (trimmed !== "") {
      doc.fontSize(10).fillColor("#334155").text(trimmed, { lineGap: 3 })
    } else {
      doc.moveDown(0.3)
    }
  })

  doc.end()
}

/**
 * Helper to write a clean DOCX document
 */
function generateDocxFile(filePath, contentText, name, title) {
  const lines = contentText.split("\n")
  const paragraphs = [
    new Paragraph({
      children: [
        new TextRun({
          text: name,
          bold: true,
          size: 32,
          color: "1e1b4b"
        })
      ]
    })
  ]

  if (title) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            size: 22,
            color: "475569",
            italic: true
          })
        ]
      })
    )
  }

  paragraphs.push(new Paragraph({ text: "" }))

  lines.forEach(line => {
    const trimmed = line.trim()
    if (trimmed.startsWith("###")) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed.replace(/^###\s*/, ""),
              bold: true,
              size: 24,
              color: "1e1b4b"
            })
          ]
        })
      )
    } else if (trimmed.startsWith("##")) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed.replace(/^##\s*/, ""),
              bold: true,
              size: 28,
              color: "1e1b4b"
            })
          ]
        })
      )
    } else if (trimmed.startsWith("#")) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed.replace(/^#\s*/, ""),
              bold: true,
              size: 32,
              color: "1e1b4b"
            })
          ]
        })
      )
    } else {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed,
              size: 20,
              color: "334155"
            })
          ]
        })
      )
    }
  })

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs
      }
    ]
  })

  Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync(filePath, buffer)
  })
}

/**
 * Trigger AI Resume Tailoring pipeline using Claude Sonnet Thinking
 * POST /api/resume/tailor
 */
export async function tailorResume(req, res, next) {
  const { jobId } = req.body

  try {
    if (!jobId) {
      return res.status(400).json({ message: "jobId is required for tailoring." })
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
You are an expert ATS optimizer and resume writer.
Tailor the user's Master Career Profile specifically to target the provided Job description.
Optimize bullet points, align key phrasing, highlight relevant skills, and format the resume content professionally.
Factual correctness is mandatory: only rephrase, restructure, or prioritize existing items. Never invent experiences or skills.

User Master Career Profile:
${JSON.stringify(profilePayload)}

Target Job Details:
Company: ${job.company}
Position: ${job.role}
Job Description:
${job.jobDescription}

Perform the tailoring and output a single JSON object containing:
1. "tailoredText": A fully formatted, polished markdown resume content that is optimized for this job. Include Name, Headline, Contact (if present), Skills list, Experience sections (with optimized bullet points), Education list, and Projects/Certifications.
2. "atsScore": An integer (0-100) representing the match score of this tailored resume.
3. "keywordCoverage": An array of strings representing JD keywords successfully mapped.
4. "missingSkills": An array of strings representing JD skills that are still missing.
5. "suggestions": An array of strings containing actionable feedback and rephrasing explanations.

Return ONLY valid raw JSON starting with '{' and ending with '}'. Do not include markdown code block tags.
`
    const messages = [
      { role: "system", content: "You are a precise resume parser returning raw JSON." },
      { role: "user", content: prompt }
    ]

    console.log("AI Resume Tailor: Invoking Claude Sonnet Thinking model...")
    const rawResponse = await aiOrchestrator.execute("resume-tailoring", messages)
    
    let cleaned = rawResponse.trim()
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "").trim()
    }

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (parseError) {
      console.error("Failed to parse Claude resume tailoring response:", cleaned, parseError)
      return res.status(500).json({
        message: "Failed to parse AI tailoring response. Please try again.",
        rawResponse
      })
    }

    const timestamp = Date.now()
    const dir = path.join("uploads", "tailored")
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const pdfFileName = `${req.userId}_${jobId}_${timestamp}.pdf`
    const docxFileName = `${req.userId}_${jobId}_${timestamp}.docx`

    const pdfPath = path.join(dir, pdfFileName)
    const docxPath = path.join(dir, docxFileName)

    // Generate physical documents
    generatePdfFile(pdfPath, parsed.tailoredText || "", user.name, user.headline)
    generateDocxFile(docxPath, parsed.tailoredText || "", user.name, user.headline)

    // Store in TailoredResume collection
    const tailored = new TailoredResume({
      user: req.userId,
      job: jobId,
      company: job.company,
      position: job.role,
      tailoredText: parsed.tailoredText,
      atsScore: parsed.atsScore || 50,
      keywordCoverage: parsed.keywordCoverage || [],
      missingSkills: parsed.missingSkills || [],
      suggestions: parsed.suggestions || [],
      pdfFileName,
      docxFileName
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
    const tailored = await TailoredResume.findOne({ _id: id, user: req.userId })
    if (!tailored || !tailored.docxFileName) {
      return res.status(404).json({ message: "DOCX document not found." })
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
