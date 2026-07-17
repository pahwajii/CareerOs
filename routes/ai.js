import express from "express"
import auth from "../middleware/auth.js"
import {
  getPrep,
  analyzeResume,
  getApplyAssist,
  matchAnalyze
} from "../controllers/aiController.js"
import {
  generateOutreach,
  saveOutreach,
  getOutreachHistories,
  deleteOutreach
} from "../controllers/outreachController.js"

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
// @desc    Cover letter generator (legacy)
// @access  Private
router.post("/apply-assist", auth, getApplyAssist)

// @route   POST /api/ai/outreach/generate
// @desc    Outreach & cover letter generator (GPT-5.5)
// @access  Private
router.post("/outreach/generate", auth, generateOutreach)

// @route   POST /api/ai/outreach/save
// @desc    Save outreach template to MongoDB
// @access  Private
router.post("/outreach/save", auth, saveOutreach)

// @route   GET /api/ai/outreach/:jobId
// @desc    Get outreach templates list for a job
// @access  Private
router.get("/outreach/:jobId", auth, getOutreachHistories)

// @route   DELETE /api/ai/outreach/:id
// @desc    Delete saved outreach template
// @access  Private
router.delete("/outreach/:id", auth, deleteOutreach)

export default router
