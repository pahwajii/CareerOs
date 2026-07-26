import express from "express"
import multer from "multer"
import auth from "../middleware/auth.js"
import {
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  updateChecklist,
  getAnalytics,
  importExcelJobs,
  batchCreateJobs
} from "../controllers/jobController.js"

const router = express.Router()

// Multer memory storage configuration for spreadsheet files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

// @route   GET /api/jobs
// @desc    Get all jobs for logged-in user
// @access  Private
router.get("/", auth, getJobs)

// @route   POST /api/jobs
// @desc    Create a job application
// @access  Private
router.post("/", auth, createJob)

// @route   POST /api/jobs/import-excel
// @desc    Parse uploaded Excel / CSV sheet file
// @access  Private
router.post("/import-excel", auth, upload.single("file"), importExcelJobs)

// @route   POST /api/jobs/batch-create
// @desc    Batch create job applications
// @access  Private
router.post("/batch-create", auth, batchCreateJobs)

// @route   GET /api/jobs/analytics
// @desc    Get aggregated job statistics
// @access  Private
router.get("/analytics", auth, getAnalytics)

// @route   PUT /api/jobs/:id
// @desc    Update a job application
// @access  Private
router.put("/:id", auth, updateJob)

// @route   DELETE /api/jobs/:id
// @desc    Delete a job application
// @access  Private
router.delete("/:id", auth, deleteJob)

// @route   PUT /api/jobs/:id/checklist
// @desc    Update/toggle/add/remove checklist items for a job
// @access  Private
router.put("/:id/checklist", auth, updateChecklist)

export default router

