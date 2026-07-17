import pdf from "pdf-parse"
import fs from "fs"
import path from "path"
import User from "../models/User.js"

/**
 * Get full user profile
 * GET /api/profile
 */
export async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.userId).select("-password")
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.json(user)
  } catch (error) {
    next(error)
  }
}

/**
 * Update full user profile
 * PUT /api/profile
 */
export async function updateProfile(req, res, next) {
  const {
    name,
    phone,
    headline,
    bio,
    profileLinks,
    codingProfiles,
    education,
    experience,
    projects,
    certifications,
    skills,
    careerPreferences
  } = req.body

  try {
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (name !== undefined) user.name = name
    if (phone !== undefined) user.phone = phone
    if (headline !== undefined) user.headline = headline
    if (bio !== undefined) user.bio = bio

    if (profileLinks !== undefined) {
      user.profileLinks = {
        linkedin: profileLinks.linkedin || "",
        github: profileLinks.github || "",
        leetcode: profileLinks.leetcode || "",
        portfolio: profileLinks.portfolio || ""
      }
    }

    if (codingProfiles !== undefined) {
      user.codingProfiles = {
        leetcode: codingProfiles.leetcode || "",
        codechef: codingProfiles.codechef || "",
        github: codingProfiles.github || "",
        linkedin: codingProfiles.linkedin || "",
        portfolio: codingProfiles.portfolio || ""
      }
    }

    if (education !== undefined) user.education = education
    if (experience !== undefined) user.experience = experience
    if (projects !== undefined) user.projects = projects
    if (certifications !== undefined) user.certifications = certifications
    if (skills !== undefined) user.skills = skills
    if (careerPreferences !== undefined) user.careerPreferences = careerPreferences

    await user.save()
    res.json(user)
  } catch (error) {
    next(error)
  }
}

/**
 * Upload resume PDF, parse/extract text and save file physically
 * POST /api/profile/upload-resume
 */
export async function uploadResumeFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload a resume PDF file" })
    }

    // Extract text from the PDF buffer
    const parsedPdf = await pdf(req.file.buffer)
    const text = parsedPdf.text

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: "Could not extract text from the PDF. Ensure the file contains readable text." })
    }

    // Save PDF physically to disk in backend/uploads/resumes
    const dir = path.join("uploads", "resumes")
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const filePath = path.join(dir, `${req.userId}_resume.pdf`)
    fs.writeFileSync(filePath, req.file.buffer)

    // Cache metadata & text on user record
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    user.resumeText = text.trim()
    user.resumeFileName = req.file.originalname
    await user.save()

    res.json({
      message: "Resume PDF uploaded and parsed successfully!",
      resumeFileName: user.resumeFileName,
      resumeTextLength: user.resumeText.length
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Upload portfolio file and save physically
 * POST /api/profile/upload-portfolio
 */
export async function uploadPortfolioFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload a portfolio file" })
    }

    // Save portfolio file physically to disk in backend/uploads/portfolios
    const dir = path.join("uploads", "portfolios")
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const extension = req.file.originalname.substring(req.file.originalname.lastIndexOf("."))
    const filePath = path.join(dir, `${req.userId}_portfolio${extension}`)
    fs.writeFileSync(filePath, req.file.buffer)

    // Cache metadata on user record
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    user.portfolioFileName = req.file.originalname
    await user.save()

    res.json({
      message: "Portfolio file uploaded successfully!",
      portfolioFileName: user.portfolioFileName
    })
  } catch (error) {
    next(error)
  }
}
