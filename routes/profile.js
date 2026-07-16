import express from "express"
import auth from "../middleware/auth.js"
import { updateProfileLinks } from "../controllers/profileController.js"

const router = express.Router()

// @route   PUT /api/profile-links
// @desc    Update user's profile links
// @access  Private
router.put("/", auth, updateProfileLinks)

export default router
