import express from "express"
import auth from "../middleware/auth.js"
import { getPrep, analyzeResume, getApplyAssist } from "../controllers/aiController.js"

const router = express.Router()

// @route   POST /api/ai/prep
// @desc    Generate outreach email and interview prep tips for a job application
// @access  Private
router.post("/prep", auth, getPrep)

// @route   POST /api/ai/resume-analyze
// @desc    Analyze a resume against a job description
// @access  Private
router.post("/resume-analyze", auth, analyzeResume)

// @route   POST /api/ai/apply-assist
// @desc    Generate tailored cover letter and why this company answer
// @access  Private
router.post("/apply-assist", auth, getApplyAssist)

export default router
