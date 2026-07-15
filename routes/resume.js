import express from "express"
import multer from "multer"
import pdf from "pdf-parse"
import auth from "../middleware/auth.js"
import User from "../models/User.js"

const router = express.Router()

// Multer memory storage configuration
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true)
    } else {
      cb(new Error("Only PDF files are allowed"))
    }
  }
})

// @route   POST /api/resume/upload
// @desc    Upload user resume (PDF) and extract text to cache on user record
// @access  Private
router.post("/upload", auth, upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload a resume PDF file" })
    }

    // Extract text from PDF buffer
    const parsedPdf = await pdf(req.file.buffer)
    const text = parsedPdf.text

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: "Could not extract text from the PDF. Please make sure the PDF contains readable text (not just images)." })
    }

    // Save text to user's record
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    user.resumeText = text.trim()
    await user.save()

    res.json({
      message: "Resume uploaded and text extracted successfully!",
      resumeText: user.resumeText,
      resumeTextLength: user.resumeText.length
    })
  } catch (error) {
    console.error("Resume upload error:", error)
    res.status(500).json({ message: error.message || "Server error parsing resume PDF" })
  }
})

export default router
