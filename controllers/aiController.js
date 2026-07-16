import Job from "../models/Job.js"
import User from "../models/User.js"
import aiService from "../services/aiService.js"

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
