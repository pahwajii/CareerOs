import express from "express"
import multer from "multer"
import auth from "../middleware/auth.js"
import { uploadResume } from "../controllers/resumeController.js"

const router = express.Router()

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
router.post("/upload", auth, upload.single("resume"), uploadResume)

export default router
