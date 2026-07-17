import express from "express"
import auth from "../middleware/auth.js"
import {
  getPrep,
  analyzeResume,
  getApplyAssist,
  matchAnalyze
} from "../controllers/aiController.js"

const router = express.Router()

// @route   POST /api/ai/prep
// @desc    Get prep guides and outreach templates
// @access  Private
router.post("/prep", auth, getPrep)

// @route   POST /api/ai/resume-analyze
// @desc    ATS Match checking (legacy uploaded text mode)
// @access  Private
router.post("/resume-analyze", auth, analyzeResume)

// @route   POST /api/ai/match-analyze
// @desc    Master Career Profile vs Job Description Match Engine (DeepSeek R1)
// @access  Private
router.post("/match-analyze", auth, matchAnalyze)

// @route   POST /api/ai/apply-assist
// @desc    Cover letter generator
// @access  Private
router.post("/apply-assist", auth, getApplyAssist)

export default router
