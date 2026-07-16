import User from "../models/User.js"

/**
 * Update user's profile links
 * PUT /api/profile-links
 */
export async function updateProfileLinks(req, res, next) {
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
    next(error)
  }
}
