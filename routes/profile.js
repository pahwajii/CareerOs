import express from "express"
import auth from "../middleware/auth.js"
import User from "../models/User.js"

const router = express.Router()

// @route   PUT /api/profile-links
// @desc    Update user's profile links
// @access  Private
router.put("/", auth, async (req, res) => {
  const { linkedin, github, leetcode, portfolio } = req.body

  try {
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    user.profileLinks = {
      linkedin: linkedin || "",
      github: github || "",
      leetcode: leetcode || "",
      portfolio: portfolio || ""
    }

    await user.save()

    res.json({
      message: "Profile links updated successfully",
      profileLinks: user.profileLinks
    })
  } catch (error) {
    console.error("Profile links update error:", error)
    res.status(500).json({ message: "Server error updating profile links" })
  }
})

export default router
