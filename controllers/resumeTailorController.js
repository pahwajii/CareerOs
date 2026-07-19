import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import mongoose from "mongoose"
import PDFDocument from "pdfkit"
import User from "../models/User.js"
import Job from "../models/Job.js"
import TailoredResume from "../models/TailoredResume.js"
import aiOrchestrator from "../services/aiOrchestrator.js"

const REFERENCE_LATEX_TEMPLATE = `\\documentclass[10pt,letterpaper]{article}

\\usepackage[left=0.42in,top=0.25in,right=0.42in,bottom=0.25in]{geometry}
\\usepackage{hyperref}
\\hypersetup{colorlinks=true, urlcolor=blue, linkcolor=blue}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{array}
\\usepackage{xcolor}
\\usepackage{parskip}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}

\\titleformat{\\section}{\\normalfont\\bfseries\\uppercase}{}{0em}{}[\\titlerule]
\\titlespacing{\\section}{0pt}{3pt}{2pt}

\\setlist[itemize]{noitemsep, topsep=0pt, parsep=0pt, partopsep=0pt, leftmargin=1.1em}

\\pagestyle{empty}

\\begin{document}

% ---- HEADER ----
{\\centering
  {\\large \\textbf{LAKSHAY PAHWA}} \\\\[1pt]
  \\small
  Software Engineer $\\;|\\;$ Full-Stack Development \\textbullet{} React.js/Node.js \\textbullet{} REST APIs \\textbullet{} AI-Assisted Development \\\\[1pt]
  \\href{mailto:lakshaypahwa47@gmail.com}{lakshaypahwa47@gmail.com} $\\;|\\;$
  +91-6396339806 $\\;|\\;$
  \\href{https://github.com/pahwajii}{github.com/pahwajii} $\\;|\\;$
  \\href{https://linkedin.com/in/lakshay-pahwa-a45991251}{linkedin.com/in/lakshay-pahwa-a45991251}
\\par}

\\vspace{2pt}

% ---- EDUCATION ----
\\section{Education}
\\vspace{1pt}
\\textbf{B.Tech in Computer Science \\& Engineering} \\hfill {2022 -- 2026} \\\\
Bundelkhand Institute of Engineering \\& Technology (BIET), Jhansi \\hfill CGPA: 8.19/10.00

% ---- SKILLS ----
\\section{Technical Skills}
\\vspace{2pt}
\\begin{tabular}{@{} >{\\bfseries}l @{\\hspace{2ex}} l}
Languages       & JavaScript (ES6+), TypeScript, Java (academic), C++, SQL \\\\
Web Frameworks  & React.js, Next.js, Node.js, Express.js, NestJS (familiar), REST API Design, MVC Architecture \\\\
Databases       & MongoDB, MySQL, PostgreSQL, Firebase Firestore, Redis \\\\
AI Tools \\& Workflows & Claude Code, Cursor, GitHub Copilot, ChatGPT, Google Gemini, Google Antigravity, \\\\
                & OpenAI API Integration, Prompt Engineering, AI-Assisted Debugging \\& Code Review \\\\
Security        & JWT Auth, RBAC Access Control, Webhook Signature Validation, Input Sanitization \\\\
Tools           & Git, GitHub (PR reviews), Postman, Jest, Docker, Vercel, Render, AWS (basic) \\\\
Practices       & Agile/Scrum, Code Reviews, Technical Documentation, Cross-functional Collaboration \\\\
\\end{tabular}

% ---- WORK EXPERIENCE ----
\\section{Work Experience}
\\vspace{2pt}

\\textbf{SDE Intern --- Hanabi Technologies} \\hfill Dec 2025 -- Feb 2026 \\\\[-10pt]
\\begin{itemize}
  \\item Built and shipped 6+ large-scale production RESTful APIs consumed by React-based client apps, quickly ramping up on an unfamiliar existing application portfolio to provide ongoing support.
  \\item Integrated OpenAI content-moderation API with robust error handling, retry logic, and input validation, applying secure development best practices to guard against malformed/malicious data.
  \\item Authored API contracts and 15+ Jest unit/integration test cases; actively participated in code reviews with senior engineers, giving and receiving constructive feedback before merging PRs.
  \\item Used AI coding tools (Claude Code, Cursor) to accelerate boilerplate generation and test scaffolding, manually reviewing and validating all AI-generated code before merge.
\\end{itemize}

\\vspace{2pt}
\\textbf{Developer Intern --- Good Dopamine Technologies Pvt. Ltd.} \\hfill Nov 2025 -- Dec 2025 \\\\[-10pt]
\\begin{itemize}
  \\item Engineered Node.js/Express applications following MVC architecture for a collaborative video-editor platform; collaborated daily with a cross-functional team of developers and product managers.
  \\item Implemented RBAC permission handling (3 user roles) with security-conscious access-control logic; proactively documented processes and troubleshooting steps to support the wider team.
\\end{itemize}

\\vspace{2pt}
\\textbf{SDE Intern --- Veridia.io} \\hfill Sept 2025 -- Oct 2025 \\\\[-10pt]
\\begin{itemize}
  \\item Investigated and resolved MySQL/MongoDB query bottlenecks in an unfamiliar production system, restructuring indexing strategies and cutting execution time by $\\sim$20\\%.
  \\item Proposed and implemented Redis caching as an alternative architecture to reduce response time by $\\sim$15\\%, presenting findings and recommendations to the team.
\\end{itemize}

% ---- PROJECTS ----
\\section{Projects}
\\vspace{2pt}

\\textbf{Research Paper Reading Tracker} \\hfill Feb 2026 \\\\[-3pt]
{\\small\\textit{React $|$ TypeScript $|$ Node.js $|$ Express $|$ MySQL $|$ MongoDB $|$ JWT $|$ Recharts $|$ Vercel/Render}} \\\\[-10pt]
\\begin{itemize}
  \\item Designed and built a large-scale full-stack application end-to-end (frontend, REST backend, auth, analytics dashboards); deployed on Vercel + Render.
  \\item Implemented JWT-based authentication with per-user data isolation and wrote structured test cases covering auth, CRUD, and edge cases to minimize defects.
\\end{itemize}

\\vspace{2pt}
\\textbf{Post-It --- Real-Time Social Media Platform} \\hfill Sept 2025 \\\\[-3pt]
{\\small\\textit{Node.js $|$ Express.js $|$ MySQL $|$ MongoDB $|$ Socket.io $|$ jQuery $|$ AJAX $|$ HTML/CSS}} \\\\[-10pt]
\\begin{itemize}
  \\item Built a full-stack social platform with real-time WebSocket messaging (Socket.io) and a REST API backend supporting zero-reload feed and notification updates at scale.
  \\item Designed RESTful URL routing and dual MongoDB/MySQL data models to support future architectural growth and alternative storage strategies.
\\end{itemize}

\\vspace{2pt}
\\textbf{Subscription-based Payment System (Razorpay)} \\hfill Jan 2026 \\\\[-3pt]
{\\small\\textit{Node.js $|$ MySQL $|$ Razorpay API $|$ Webhooks $|$ Jest $|$ OOP}} \\\\[-10pt]
\\begin{itemize}
  \\item Built webhook-based payment reconciliation with signature verification, covering the full subscription lifecycle and reducing failed-transaction fallthrough by $\\sim$40\\%.
  \\item Documented 10+ API routes and maintained a shared knowledge base of failure modes, improving team troubleshooting speed across sprint cycles.
\\end{itemize}

% ---- ACHIEVEMENTS ----
\\section{Achievements \\& Certifications}
\\begin{itemize}
  \\item \\textbf{GATE 2026 Qualified} \\quad
        \\href{https://leetcode.com/u/lakshaypahwa/}{\\textbf{LeetCode:}} Rating 1817 (Top 6\\%), 300+ problems solved \\quad
        \\textbf{CodeChef:} 3$\\star$, Rating 1654
  \\item \\textbf{TCS CodeVita S13} -- Global Rank 2028 (out of 100,000+ participants) \\quad
        \\textbf{Oracle Cloud 2025} -- Data Science Professional \\& AI Foundations Associate
  \\item \\textbf{Secretary, T\\&P Cell, BIET Jhansi} -- Led placement drives \\& cross-team stakeholder communication for 200+ students
\\end{itemize}

\\end{document}`;

/**
 * Shell compilation helper using tectonic/pdflatex
 */
function compileTexToPdf(texPath, pdfPath) {
  const dir = path.dirname(texPath)
  const baseName = path.basename(texPath, ".tex")
  
  const cleanupFiles = () => {
    // Auxiliary files cleanup to prevent directory pollution
    const auxPath = path.join(dir, `${baseName}.aux`)
    const logPath = path.join(dir, `${baseName}.log`)
    const outPath = path.join(dir, `${baseName}.out`)
    if (fs.existsSync(auxPath)) fs.unlinkSync(auxPath)
    if (fs.existsSync(logPath)) fs.unlinkSync(logPath)
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
  }
  
  try {
    console.log(`LaTeX Compiler: Trying tectonic...`)
    execSync(`tectonic "${texPath}" --outdir "${dir}"`, { stdio: "ignore", timeout: 60000 })
    cleanupFiles()
    return true
  } catch (err1) {
    console.warn("Tectonic compilation failed or not installed. Trying pdflatex...", err1.message)
    try {
      execSync(`pdflatex -interaction=nonstopmode -output-directory="${dir}" "${texPath}"`, { stdio: "ignore", timeout: 60000 })
      cleanupFiles()
      return true
    } catch (err2) {
      console.error("LaTeX compilation failed on all compilers. Creating fallback message PDF.")
      cleanupFiles()
      try {
        const fallbackDoc = new PDFDocument({ margin: 36 })
        const stream = fs.createWriteStream(pdfPath)
        fallbackDoc.pipe(stream)
        fallbackDoc.fontSize(16).fillColor("#4f46e5").text("LaTeX Compilation Fallback Message", { underline: true })
        fallbackDoc.moveDown()
        fallbackDoc.fontSize(11).fillColor("#1e293b").text(
          "Your tailored LaTeX (.tex) source code was generated successfully, but the PDF compilation failed because no LaTeX compiler (tectonic or pdflatex) was found on your local system PATH.\n\n" +
          "To enable automatic PDF resume generation, please install tectonic or a LaTeX suite:\n" +
          "- Windows: winget install Tectonic.Tectonic\n" +
          "- macOS: brew install tectonic\n" +
          "- Linux: sudo apt install tectonic\n\n" +
          "Alternatively, you can download the tailored LaTeX (.tex) file from your dashboard and paste it into Overleaf.com to compile your resume online.",
          { lineGap: 4 }
        )
        fallbackDoc.end()
        return false
      } catch (pdfError) {
        console.error("Failed to write fallback PDF:", pdfError)
        return false
      }
    }
  }
}

/**
 * Shell conversion helper using pandoc
 */
function convertTexToDocx(texPath, docxPath) {
  try {
    console.log(`Pandoc Converter: Compiling to DOCX...`)
    execSync(`pandoc "${texPath}" -o "${docxPath}"`, { stdio: "ignore", timeout: 30000 })
    return true
  } catch (err) {
    console.warn("Pandoc is not installed or conversion failed. Skipping DOCX generation.", err.message)
    return false
  }
}

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
You are an expert ATS resume optimizer and LaTeX resume editor.

You will be given:
1. A REFERENCE LATEX TEMPLATE — this is the user's exact, approved one-page resume format.
2. The user's Master Career Profile (JSON) — the full, factual source of truth for their experience.
3. A Target Job Description.

Your task: produce a NEW, COMPLETE LaTeX document that is a content-tailored version of the
REFERENCE LATEX TEMPLATE, optimized for the Target Job Description.

═══════════════════════════════════════════
STRUCTURAL RULES — DO NOT VIOLATE
═══════════════════════════════════════════
1. Preserve the LaTeX preamble EXACTLY as given (\\documentclass, all \\usepackage lines,
   \\hypersetup, \\titleformat, \\titlespacing, \\setlist, \\pagestyle, margins). Do not add,
   remove, or reorder packages or settings.
2. Preserve the exact section order:
   Education → Technical Skills → Work Experience → Projects → Achievements & Certifications
   (add "Professional Summary" only if the reference template has it — otherwise omit it,
   since the reference template above does not use one).
3. Preserve every formatting macro pattern exactly as demonstrated in the reference, including:
   - \\[-10pt] placed immediately after a bold title/date line, before \\begin{itemize}
   - \\vspace{2pt} between job/project entries and between major sections
   - \\textbf{...} \\hfill {...} pattern for title-left / date-right lines
   - {\\small\\textit{...}} tech-stack line under each project title, separated by $|$
   - The \\begin{tabular}{@{} >{\\bfseries}l @{\\hspace{2ex}} l} ... \\end{tabular} structure
     for Technical Skills (category bold, left column; values, right column)
   - Achievement bullets grouped with \\textbf{} sub-labels the same way as the reference
4. Preserve the header block verbatim in structure (name centered/bold, headline, contact line
   with $\\;|\\;$ separators and \\href for email/github/linkedin) — only substitute the actual
   values (name, headline, email, phone, links) from the user's profile if provided; otherwise
   keep the reference header values.
5. Output ONLY valid, compilable LaTeX — the full document from \\documentclass to \\end{document}.
   No markdown, no code fences, no commentary before or after.
6. Escape LaTeX special characters (&, %, $, #, _) in any user content you insert.
7. The result MUST fit on a single A4 page at 10pt with the given margins — this is non-negotiable.
   Trim, shorten, or drop lower-priority bullets/projects/achievements as needed to guarantee
   single-page fit, prioritizing content most relevant to the Target Job Description.

═══════════════════════════════════════════
CONTENT RULES — WHAT YOU MAY CHANGE
═══════════════════════════════════════════
- Headline tagline: adapt to mirror the target role's title/keywords.
- Technical Skills table: reorder rows/values and re-select which skills are surfaced (from the
  user's actual skills only) to match JD keywords; do not invent skills or tools not present in
  the Master Career Profile.
- Work Experience: you may reorder bullets within a role by relevance, rewrite bullet phrasing
  for impact and JD-keyword alignment, and bold key technologies — but max 3-4 bullets per role,
  and every bullet must trace back to something factually present in the profile. Never invent
  metrics, technologies, or responsibilities.
- Projects: select and order projects by relevance to the JD (drop least-relevant projects
  first if space is tight); rewrite bullets the same way as Work Experience.
- Achievements & Certifications: reorder/trim by relevance; do not invent credentials.
- You may compress or expand \\vspace values by no more than ±1pt if needed for single-page fit,
  but do not remove them entirely.

Factual correctness is mandatory. Only rephrase, restructure, reorder, or select from EXISTING
items in the Master Career Profile. Never fabricate experience, skills, metrics, or credentials.

═══════════════════════════════════════════
REFERENCE LATEX TEMPLATE
═══════════════════════════════════════════
${REFERENCE_LATEX_TEMPLATE}

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
1. "tailoredLatex": the complete tailored .tex document, base64-encoded as a string (to prevent JSON parsing conflicts with backslashes and newlines).
2. "atsScore": integer 0-100, match score of this tailored resume against the JD.
3. "keywordCoverage": array of JD keywords successfully mapped into the resume.
4. "missingSkills": array of JD-relevant skills the user's profile does not support.
5. "suggestions": array of actionable feedback strings.

Return ONLY valid raw JSON starting with '{' and ending with '}'. Do not include markdown code block tags.
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
      const sanitized = cleaned.replace(/\\(?!["\\/bfnrtu])/g, "\\\\")
      parsed = JSON.parse(sanitized)
    } catch (parseError) {
      console.error("Failed to parse AI resume tailoring response:", cleaned, parseError)
      return res.status(500).json({
        message: "Failed to parse AI tailoring response. Please try again.",
        rawResponse
      })
    }

    // Decode tailored LaTeX content from base64
    let tailoredLatex = ""
    try {
      if (!parsed.tailoredLatex) {
        throw new Error("Missing tailoredLatex field in response")
      }
      tailoredLatex = Buffer.from(parsed.tailoredLatex, "base64").toString("utf-8")
    } catch (decodeError) {
      console.error("Failed to decode base64 LaTeX content:", parsed.tailoredLatex, decodeError)
      return res.status(500).json({
        message: "Failed to decode base64 LaTeX content from AI response.",
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
    const texFileName = `${req.userId}_${jobId}_${timestamp}.tex`

    const pdfPath = path.join(dir, pdfFileName)
    const docxPath = path.join(dir, docxFileName)
    const texPath = path.join(dir, texFileName)

    // Write LaTeX source file to disk
    fs.writeFileSync(texPath, tailoredLatex)

    // Compile and convert
    const pdfSuccess = compileTexToPdf(texPath, pdfPath)
    const docxSuccess = convertTexToDocx(texPath, docxPath)

    // Store in TailoredResume collection
    const tailored = new TailoredResume({
      user: req.userId,
      job: jobId,
      company: job.company,
      position: job.role,
      tailoredText: tailoredLatex,
      atsScore: parsed.atsScore || 50,
      keywordCoverage: parsed.keywordCoverage || [],
      missingSkills: parsed.missingSkills || [],
      suggestions: parsed.suggestions || [],
      pdfFileName,
      docxFileName: docxSuccess ? docxFileName : "", // Only store docxFileName if Pandoc compiled it successfully
      texFileName,
      modelUsed: useModel || "claude-sonnet-4-6",
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
