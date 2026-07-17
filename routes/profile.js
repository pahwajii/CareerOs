import express from "express"
import multer from "multer"
import auth from "../middleware/auth.js"
import {
  getProfile,
  updateProfile,
  uploadResumeFile,
  uploadPortfolioFile
} from "../controllers/profileController.js"

const router = express.Router()

// Multer memory storage parser
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit size to 10MB
  fileFilter: (req, file, cb) => {
    // Standard resume & portfolio uploads support PDF, images, docs
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Only PDF and image files are allowed"))
    }
  }
})

// @route   GET /api/profile
// @desc    Get user's profile
// @access  Private
router.get("/", auth, getProfile)

// @route   PUT /api/profile
// @desc    Update user's profile details
// @access  Private
router.put("/", auth, updateProfile)

// @route   POST /api/profile/upload-resume
// @desc    Upload user's resume file
// @access  Private
router.post("/upload-resume", auth, upload.single("resume"), uploadResumeFile)

// @route   POST /api/profile/upload-portfolio
// @desc    Upload user's portfolio file
// @access  Private
router.post("/upload-portfolio", auth, upload.single("portfolio"), uploadPortfolioFile)

export default router
