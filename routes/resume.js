import express from "express"
import multer from "multer"
import auth from "../middleware/auth.js"
import { uploadResume } from "../controllers/resumeController.js"
import {
  tailorResume,
  getTailoredHistories,
  downloadPdf,
  downloadDocx
} from "../controllers/resumeTailorController.js"

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

// @route   POST /api/resume/tailor
// @desc    Run AI Resume Tailoring pipeline on user's Master Profile
// @access  Private
router.post("/tailor", auth, tailorResume)

// @route   GET /api/resume/tailor/:jobId
// @desc    Get list of tailored resume versions for a job
// @access  Private
router.get("/tailor/:jobId", auth, getTailoredHistories)

// @route   GET /api/resume/download/pdf/:id
// @desc    Download tailored PDF version
// @access  Private
router.get("/download/pdf/:id", auth, downloadPdf)

// @route   GET /api/resume/download/docx/:id
// @desc    Download tailored DOCX version
// @access  Private
router.get("/download/docx/:id", auth, downloadDocx)

export default router
