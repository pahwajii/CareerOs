import pdf from "pdf-parse"
import User from "../models/User.js"

/**
 * Upload user resume (PDF) and extract text to cache on user record
 * POST /api/resume/upload
 */
export async function uploadResume(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload a resume PDF file" })
    }

    const parsedPdf = await pdf(req.file.buffer)
    const text = parsedPdf.text

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: "Could not extract text from the PDF. Please make sure the PDF contains readable text (not just images)." })
    }

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
    next(error)
  }
}
