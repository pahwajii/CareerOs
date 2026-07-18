import fs from "fs"
import path from "path"
import PDFDocument from "pdfkit"
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx"
import User from "../models/User.js"
import Job from "../models/Job.js"
import TailoredResume from "../models/TailoredResume.js"
import aiOrchestrator from "../services/aiOrchestrator.js"

/**
 * PDF inline bold markdown parsing text helper
 */
function renderRichText(doc, text, fontSize, color, options = {}) {
  doc.fontSize(fontSize).fillColor(color)
  
  const boldRegex = /\*\*(.*?)\*\*/g
  let lastIndex = 0
  let match
  
  while ((match = boldRegex.exec(text)) !== null) {
    const precedingText = text.substring(lastIndex, match.index)
    if (precedingText) {
      doc.font("Helvetica").text(precedingText, { ...options, continued: true })
    }
    doc.font("Helvetica-Bold").text(match[1], { ...options, continued: true })
    lastIndex = boldRegex.lastIndex
  }
  
  const remainingText = text.substring(lastIndex)
  doc.font("Helvetica").text(remainingText, { ...options, continued: false })
}

/**
 * DOCX inline bold markdown parsing text helper
 */
function parseRichTextDocx(text, boldDefault = false) {
  const runs = []
  const parts = text.split("**")
  parts.forEach((part, index) => {
    const isBold = index % 2 !== 0
    if (part) {
      runs.push(
        new TextRun({
          text: part,
          bold: isBold || boldDefault,
          size: 17, // 8.5pt
          color: "334155"
        })
      )
    }
  })
  return runs
}

/**
 * Helper to write a clean PDF document conforming to the exact 1-page template
 */
function generatePdfFile(filePath, contentText, user) {
  // Margin 35 (or 30) for compact 1-page fit
  const doc = new PDFDocument({ margin: 35, size: "A4" })
  const writeStream = fs.createWriteStream(filePath)
  doc.pipe(writeStream)

  const pageWidth = doc.page.width - 70 // Width inside margins
  const fontSize = 8.5

  // 1. Render Header Title (Capitalized)
  doc.fontSize(14).fillColor("#000000").font("Helvetica-Bold").text((user.name || "").toUpperCase(), { align: "center" })
  
  // 2. Render Headline Tagline
  if (user.headline) {
    doc.moveDown(0.15)
    doc.fontSize(8.5).fillColor("#000000").font("Helvetica").text(user.headline, { align: "center" })
  }

  // 3. Render Contact information line
  const contacts = []
  if (user.email) contacts.push(user.email)
  if (user.phone) contacts.push(user.phone)
  if (user.codingProfiles?.github) {
    contacts.push(user.codingProfiles.github.replace(/^https?:\/\/(www\.)?/, ""))
  }
  if (user.codingProfiles?.linkedin) {
    contacts.push(user.codingProfiles.linkedin.replace(/^https?:\/\/(www\.)?/, ""))
  }
  if (user.codingProfiles?.portfolio) {
    contacts.push("Portfolio")
  }
  
  const contactText = contacts.join("   |   ")
  if (contactText) {
    doc.moveDown(0.15)
    doc.fontSize(8).fillColor("#1d4ed8").font("Helvetica").text(contactText, { align: "center" })
  }
  
  doc.moveDown(0.6)

  // 4. Split and Render Body Lines
  const lines = contentText.split("\n")
  lines.forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) {
      doc.moveDown(0.2)
      return
    }

    // Section Header (e.g. ## WORK EXPERIENCE)
    if (trimmed.startsWith("##")) {
      const title = trimmed.replace(/^##+\s*/, "").toUpperCase()
      doc.moveDown(0.45)
      doc.fontSize(9.5).fillColor("#000000").font("Helvetica-Bold").text(title, { align: "left" })
      
      // Draw thin horizontal separator line directly below heading
      doc.moveDown(0.12)
      doc.moveTo(35, doc.y).lineTo(doc.page.width - 35, doc.y).strokeColor("#cbd5e1").lineWidth(0.5).stroke()
      doc.moveDown(0.25)
    }
    // Left-Right Split Items (e.g. Role :: Dates)
    else if (trimmed.includes("::")) {
      const parts = trimmed.split("::").map(p => p.trim())
      const left = parts[0]
      const right = parts[1] || ""
      
      const currentY = doc.y
      doc.fontSize(8.5).fillColor("#000000").font("Helvetica-Bold")
      doc.text(left, 35, currentY, { align: "left", width: pageWidth - 100 })
      
      doc.font("Helvetica")
      doc.text(right, 35, currentY, { align: "right", width: pageWidth })
      
      doc.y = Math.max(doc.y, currentY + 11)
    }
    // Bullet Points
    else if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
      const bulletText = trimmed.replace(/^[-*]\s*/, "")
      const currentY = doc.y
      doc.fontSize(fontSize).fillColor("#334155").font("Helvetica").text("   •   ", 35, currentY, { continued: true })
      renderRichText(doc, bulletText, fontSize, "#334155", { lineGap: 1.5 })
    }
    // Regular Lines
    else {
      renderRichText(doc, trimmed, fontSize, "#334155", { lineGap: 1.5 })
    }
  })

  doc.end()
}

/**
 * Helper to write a clean DOCX document conforming to the exact 1-page template
 */
function generateDocxFile(filePath, contentText, user) {
  const lines = contentText.split("\n")
  
  // 1. Create Header Paragraphs
  const paragraphs = [
    new Paragraph({
      alignment: "center",
      children: [
        new TextRun({
          text: (user.name || "").toUpperCase(),
          bold: true,
          size: 28, // 14pt
          color: "000000"
        })
      ]
    })
  ]

  if (user.headline) {
    paragraphs.push(
      new Paragraph({
        alignment: "center",
        children: [
          new TextRun({
            text: user.headline,
            size: 17, // 8.5pt
            color: "000000"
          })
        ]
      })
    )
  }

  const contacts = []
  if (user.email) contacts.push(user.email)
  if (user.phone) contacts.push(user.phone)
  if (user.codingProfiles?.github) {
    contacts.push(user.codingProfiles.github.replace(/^https?:\/\/(www\.)?/, ""))
  }
  if (user.codingProfiles?.linkedin) {
    contacts.push(user.codingProfiles.linkedin.replace(/^https?:\/\/(www\.)?/, ""))
  }
  if (user.codingProfiles?.portfolio) {
    contacts.push("Portfolio")
  }

  const contactText = contacts.join("   |   ")
  if (contactText) {
    paragraphs.push(
      new Paragraph({
        alignment: "center",
        children: [
          new TextRun({
            text: contactText,
            size: 16, // 8pt
            color: "1d4ed8"
          })
        ]
      })
    )
  }

  paragraphs.push(new Paragraph({ text: "" }))

  // 2. Format Body Lines
  lines.forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) {
      return
    }

    if (trimmed.startsWith("##")) {
      const title = trimmed.replace(/^##+\s*/, "").toUpperCase()
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: title,
              bold: true,
              size: 19, // 9.5pt
              color: "000000"
            })
          ],
          border: {
            bottom: {
              color: "cbd5e1",
              space: 4,
              value: "single",
              size: 6
            }
          }
        })
      )
    } else if (trimmed.includes("::")) {
      const parts = trimmed.split("::").map(p => p.trim())
      const left = parts[0]
      const right = parts[1] || ""
      
      paragraphs.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "auto" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
            left: { style: BorderStyle.NONE, size: 0, color: "auto" },
            right: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 75, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: left,
                          bold: true,
                          size: 17, // 8.5pt
                          color: "000000"
                        })
                      ]
                    })
                  ]
                }),
                new TableCell({
                  width: { size: 25, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: "right",
                      children: [
                        new TextRun({
                          text: right,
                          size: 17, // 8.5pt
                          color: "000000"
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      )
    } else if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
      const bulletText = trimmed.replace(/^[-*]\s*/, "")
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "  •   ", size: 17, color: "334155" }),
            ...parseRichTextDocx(bulletText)
          ]
        })
      )
    } else {
      paragraphs.push(
        new Paragraph({
          children: parseRichTextDocx(trimmed)
        })
      )
    }
  })

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inches
              bottom: 720, // 0.5 inches
              left: 720,   // 0.5 inches
              right: 720   // 0.5 inches
            }
          }
        },
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
You are an expert ATS resume optimizer and professional writer.
Tailor the user's Master Career Profile specifically to target the provided Job description.
Your goal is to optimize the resume content to fit STRICTLY ON A SINGLE PAGE (A4 format).

To ensure high-quality layout parsing, you MUST output the "tailoredText" field in the EXACT structure specified below:

1. DO NOT output any contact info or header tags (Name, email, links, tagline) in the text itself. The PDF/DOCX generator will render the header automatically.
2. Structure the resume sections using exactly '## SECTION NAME'.
3. The sections MUST be ordered exactly as:
   ## PROFESSIONAL SUMMARY
   ## EDUCATION
   ## TECHNICAL SKILLS
   ## WORK EXPERIENCE
   ## PROJECTS
   ## ACHIEVEMENTS & CERTIFICATIONS

4. For Education, Experience, and Projects, use a special double-colon separator '::' to place dates/locations on the right margin.
   For example:
   * Under EDUCATION:
     B.Tech in Computer Science & Engineering :: 2022 – 2026
     Bundelkhand Institute of Engineering & Technology (BIET), Jhansi :: CGPA: 8.19/10.00
   * Under WORK EXPERIENCE:
     Software Engineer Intern — Hanabi Technologies :: Dec 2025 – Feb 2026
   * Under PROJECTS:
     Research Paper Reading Tracker :: Feb 2026

5. For technical skills, format it as category bold lists:
   **Programming**: JavaScript (ES6+), TypeScript, C++, DSA
   **Frontend**: React.js, HTML5, CSS3, jQuery, AJAX
   **Backend**: Node.js, Express.js, REST API Design, Webhooks
   **Databases**: MongoDB, MySQL, PostgreSQL, Redis

6. Bullet points inside Experience and Projects MUST be brief, high-impact, starting with action verbs, and have **bolding** applied on key projects/technologies. Max 3 bullet points per experience/project.
   Example:
   - Applied software engineering practices to design, develop, and maintain 6+ RESTful APIs consumed by **React** client apps.

Factual correctness is mandatory: only rephrase, restructure, or prioritize existing items. Never invent experiences or skills. Keep descriptions highly concise to avoid line wraps and guarantee everything fits onto a single page.

User Master Career Profile:
${JSON.stringify(profilePayload)}

Target Job Details:
Company: ${job.company}
Position: ${job.role}
Job Description:
${job.jobDescription}

Perform the tailoring and output a single JSON object containing:
1. "tailoredText": The formatted tailored resume text following the instructions above.
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

    // Generate physical documents with user info block
    generatePdfFile(pdfPath, parsed.tailoredText || "", user)
    generateDocxFile(docxPath, parsed.tailoredText || "", user)

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
