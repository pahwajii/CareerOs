import express from "express"
import auth from "../middleware/auth.js"
import {
  generatePrep,
  getPrep,
  updatePrep,
  deletePrep
} from "../controllers/prepController.js"

const router = express.Router()

// @route   POST /api/prep/generate
// @desc    Generate Interview Prep Study Guide via Claude Sonnet Thinking
// @access  Private
router.post("/generate", auth, generatePrep)

// @route   GET /api/prep/:jobId
// @desc    Fetch study guide for a specific job application
// @access  Private
router.get("/:jobId", auth, getPrep)

// @route   PUT /api/prep/:id
// @desc    Update study guide sections (save modifications)
// @access  Private
router.put("/:id", auth, updatePrep)

// @route   DELETE /api/prep/:id
// @desc    Delete study guide session
// @access  Private
router.delete("/:id", auth, deletePrep)

export default router
