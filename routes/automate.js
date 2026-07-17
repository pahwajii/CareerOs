import express from "express"
import auth from "../middleware/auth.js"
import { runApply } from "../controllers/automationController.js"

const router = express.Router()

// @route   POST /api/automate/apply
// @desc    Prefill job application form in headed chrome window using Playwright
// @access  Private
router.post("/apply", auth, runApply)

export default router
