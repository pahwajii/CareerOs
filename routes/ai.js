import express from "express"
import auth from "../middleware/auth.js"
import Job from "../models/Job.js"
import User from "../models/User.js"
import aiService from "../services/aiService.js"

const router = express.Router()

// @route   POST /api/ai/prep
// @desc    Generate outreach email and interview prep tips for a job application
// @access  Private
router.post("/prep", auth, async (req, res) => {
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
    console.error("AI Prep route error:", error)
    res.status(500).json({ message: error.message || "Failed to generate interview preparation material." })
  }
})

// @route   POST /api/ai/resume-analyze
// @desc    Analyze a resume against a job description (uses uploaded resume text or pasted text)
// @access  Private
router.post("/resume-analyze", auth, async (req, res) => {
  const { resumeText, jobDescription } = req.body

  try {
    let finalResumeText = resumeText

    // If no resumeText provided in body, fallback to the user's stored resume text
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
    console.error("AI Resume Analyze route error:", error)
    res.status(500).json({ message: error.message || "Failed to analyze resume." })
  }
})

// @route   POST /api/ai/apply-assist
// @desc    Generate tailored cover letter and why this company answer
// @access  Private
router.post("/apply-assist", auth, async (req, res) => {
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
    console.error("AI Apply Assist route error:", error)
    res.status(500).json({ message: error.message || "Failed to generate application assistance material." })
  }
})

export default router
