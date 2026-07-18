import Job from "../models/Job.js"
import User from "../models/User.js"
import aiService from "../services/aiService.js"
import aiOrchestrator from "../services/aiOrchestrator.js"

/**
 * Generate outreach email and interview prep tips for a job application
 * POST /api/ai/prep
 */
export async function getPrep(req, res, next) {
  const { jobId } = req.body

  try {
    if (!jobId) {
      return res.status(400).json({ message: "jobId is required" })
    }

    const job = await Job.findOne({ _id: jobId, user: req.userId })
    if (!job) {
      return res.status(404).json({ message: "Job not found or unauthorized" })
    }

    const result = await aiService.generatePrep(job.role, job.company, job.jobDescription)
    res.json({ result })
  } catch (error) {
    next(error)
  }
}

/**
 * Analyze a resume against a job description
 * POST /api/ai/resume-analyze
 */
export async function analyzeResume(req, res, next) {
  const { resumeText, jobDescription } = req.body

  try {
    let finalResumeText = resumeText

    // Fallback to user's stored resume text
    if (!finalResumeText || finalResumeText.trim() === "") {
      const user = await User.findById(req.userId)
      if (user && user.resumeText) {
        finalResumeText = user.resumeText
      }
    }

    if (!finalResumeText || finalResumeText.trim() === "") {
      return res.status(400).json({ message: "Please upload your resume first or paste your resume text." })
    }

    if (!jobDescription || jobDescription.trim() === "") {
      return res.status(400).json({ message: "Job description is required for analysis." })
    }

    const analysis = await aiService.analyzeResume(finalResumeText, jobDescription)
    res.json(analysis)
  } catch (error) {
    next(error)
  }
}

/**
 * Generate tailored cover letter and "why this company" answer
 * POST /api/ai/apply-assist
 */
export async function getApplyAssist(req, res, next) {
  const { jobId } = req.body

  try {
    if (!jobId) {
      return res.status(400).json({ message: "jobId is required" })
    }

    const job = await Job.findOne({ _id: jobId, user: req.userId })
    if (!job) {
      return res.status(404).json({ message: "Job not found or unauthorized" })
    }

    const user = await User.findById(req.userId)
    const resumeText = user ? user.resumeText : ""

    const result = await aiService.generateApplyAssist(resumeText, job.role, job.company, job.jobDescription)
    res.json({ result })
  } catch (error) {
    next(error)
  }
}

/**
 * Run match analysis of Master Profile vs Job Description using DeepSeek R1
 * POST /api/ai/match-analyze
 */
export async function matchAnalyze(req, res, next) {
  const { jobDescription } = req.body

  try {
    if (!jobDescription || jobDescription.trim() === "") {
      return res.status(400).json({ message: "Job description is required for match analysis." })
    }

    const user = await User.findById(req.userId).select("-password")
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
You are an expert ATS matching engine and technical recruiter.
Compare the user's Master Career Profile against the provided Job Description.

User Master Career Profile:
${JSON.stringify(profilePayload)}

Job Description:
${jobDescription}

Perform a rigorous match analysis and output a single JSON object containing:
1. "overallMatch": integer (0-100)
2. "skillsMatch": integer (0-100)
3. "projectMatch": integer (0-100)
4. "experienceMatch": integer (0-100)
5. "educationMatch": integer (0-100)
6. "missingKeywords": array of string (keywords missing from profile)
7. "strengths": array of string (at least 3 strengths matching the JD)
8. "weaknesses": array of string (at least 2 gap areas or weaknesses)
9. "suggestions": array of string (actionable feedback to improve the profile/resume)

Return ONLY valid raw JSON starting with '{' and ending with '}'. Do not include markdown code block tags or reasoning segments.
`
    const messages = [
      { role: "system", content: "You are a precise match parser returning raw JSON." },
      { role: "user", content: prompt }
    ]

    const rawResponse = await aiOrchestrator.execute("gap-analysis", messages)
    
    let cleaned = rawResponse.trim()
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "").trim()
    }

    try {
      const parsed = JSON.parse(cleaned)
      res.json(parsed)
    } catch (parseError) {
      console.error("Failed to parse DeepSeek matching response:", cleaned, parseError)
      res.status(500).json({
        message: "Failed to parse AI matching response. Please try again.",
        rawResponse
      })
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Parse raw job description text and extract structured parameters using Gemini Flash
 * POST /api/ai/parse-job
 */
export async function parseJobDescription(req, res, next) {
  const { text } = req.body

  try {
    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Job description text is required." })
    }

    const prompt = `
You are an expert ATS parser. Parse the following raw job description text and extract key structural parameters.
Return a single JSON object with precisely these fields:
1. "company": Company name (or empty string if not found)
2. "role": Job title / role title (or empty string if not found)
3. "location": Location details (e.g. Remote, Hybrid, or Onsite city, or empty string if not found)
4. "salary": Expected or offered salary range (or empty string if not found)
5. "jobDescription": The parsed, cleaned job description text

Raw Text:
${text}

Return ONLY valid raw JSON starting with '{' and ending with '}'. Do not include markdown code block tags.
`
    const messages = [
      { role: "system", content: "You are a precise job description parser returning raw JSON." },
      { role: "user", content: prompt }
    ]

    console.log("AI Job Parsing: Dispatching parser request to Gemini Flash...")
    const rawResponse = await aiOrchestrator.execute("job-parsing", messages)
    
    let cleaned = rawResponse.trim()
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "").trim()
    }

    try {
      const parsed = JSON.parse(cleaned)
      res.json(parsed)
    } catch (parseError) {
      console.error("Failed to parse Gemini job parsing response:", cleaned, parseError)
      res.status(500).json({
        message: "Failed to parse AI job parsing response. Please try again.",
        rawResponse
      })
    }
  } catch (error) {
    next(error)
  }
}

