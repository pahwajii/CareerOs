import express from "express"
import auth from "../middleware/auth.js"
import {
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  updateChecklist,
  getAnalytics
} from "../controllers/jobController.js"

const router = express.Router()

// @route   GET /api/jobs
// @desc    Get all jobs for logged-in user
// @access  Private
router.get("/", auth, getJobs)

// @route   POST /api/jobs
// @desc    Create a job application
// @access  Private
router.post("/", auth, createJob)

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
