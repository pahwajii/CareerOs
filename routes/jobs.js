import express from "express"
import auth from "../middleware/auth.js"
import Job from "../models/Job.js"

const router = express.Router()

// @route   GET /api/jobs
// @desc    Get all jobs for logged-in user
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const jobs = await Job.find({ user: req.userId }).sort({ createdAt: -1 })
    res.json(jobs)
  } catch (error) {
    console.error("GET jobs error:", error)
    res.status(500).json({ message: "Server error retrieving jobs" })
  }
})

// @route   POST /api/jobs
// @desc    Create a job application
// @access  Private
router.post("/", auth, async (req, res) => {
  const {
    company,
    role,
    status,
    salary,
    location,
    url,
    notes,
    source,
    jobDescription,
    appliedDate,
    checklist
  } = req.body

  try {
    if (!company || !role) {
      return res.status(400).json({ message: "Company and Role are required fields" })
    }

    const newJob = new Job({
      user: req.userId,
      company,
      role,
      status: status || "applied",
      salary: salary || "",
      location: location || "",
      url: url || "",
      notes: notes || "",
      source: source || "",
      jobDescription: jobDescription || "",
      appliedDate: appliedDate || Date.now(),
      checklist: checklist || []
    })

    const job = await newJob.save()
    res.status(201).json(job)
  } catch (error) {
    console.error("POST job error:", error)
    res.status(500).json({ message: "Server error creating job" })
  }
})

// @route   PUT /api/jobs/:id
// @desc    Update a job application
// @access  Private
router.put("/:id", auth, async (req, res) => {
  const {
    company,
    role,
    status,
    salary,
    location,
    url,
    notes,
    source,
    jobDescription,
    appliedDate,
    checklist
  } = req.body

  try {
    let job = await Job.findOne({ _id: req.params.id, user: req.userId })

    if (!job) {
      return res.status(404).json({ message: "Job not found or unauthorized" })
    }

    // Update fields if provided
    if (company !== undefined) job.company = company
    if (role !== undefined) job.role = role
    if (status !== undefined) job.status = status
    if (salary !== undefined) job.salary = salary
    if (location !== undefined) job.location = location
    if (url !== undefined) job.url = url
    if (notes !== undefined) job.notes = notes
    if (source !== undefined) job.source = source
    if (jobDescription !== undefined) job.jobDescription = jobDescription
    if (appliedDate !== undefined) job.appliedDate = appliedDate
    if (checklist !== undefined) job.checklist = checklist

    const updatedJob = await job.save()
    res.json(updatedJob)
  } catch (error) {
    console.error("PUT job error:", error)
    res.status(500).json({ message: "Server error updating job" })
  }
})

// @route   DELETE /api/jobs/:id
// @desc    Delete a job application
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, user: req.userId })

    if (!job) {
      return res.status(404).json({ message: "Job not found or unauthorized" })
    }

    res.json({ message: "Job removed successfully" })
  } catch (error) {
    console.error("DELETE job error:", error)
    res.status(500).json({ message: "Server error deleting job" })
  }
})

// @route   PUT /api/jobs/:id/checklist
// @desc    Update/toggle/add/remove checklist items for a job
// @access  Private
router.put("/:id/checklist", auth, async (req, res) => {
  const { checklist } = req.body

  try {
    if (!Array.isArray(checklist)) {
      return res.status(400).json({ message: "Checklist must be an array" })
    }

    const job = await Job.findOne({ _id: req.params.id, user: req.userId })
    if (!job) {
      return res.status(404).json({ message: "Job not found or unauthorized" })
    }

    job.checklist = checklist
    await job.save()

    res.json(job.checklist)
  } catch (error) {
    console.error("PUT checklist error:", error)
    res.status(500).json({ message: "Server error updating checklist" })
  }
})

// @route   GET /api/jobs/analytics
// @desc    Get aggregated job statistics
// @access  Private
router.get("/analytics", auth, async (req, res) => {
  try {
    const jobs = await Job.find({ user: req.userId })

    // 1. Counts by status
    const statusCounts = {
      saved: 0,
      applied: 0,
      screening: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
      withdrawn: 0
    }

    jobs.forEach(job => {
      if (statusCounts[job.status] !== undefined) {
        statusCounts[job.status]++
      }
    })

    // 2. Applications timeline (grouped by appliedDate)
    const timelineMap = {}
    jobs.forEach(job => {
      if (job.appliedDate) {
        const dateStr = new Date(job.appliedDate).toISOString().split("T")[0]
        timelineMap[dateStr] = (timelineMap[dateStr] || 0) + 1
      }
    })

    const timelineData = Object.keys(timelineMap)
      .sort()
      .map(date => ({
        date,
        count: timelineMap[date]
      }))

    // 3. Conversion rates
    // Interview rate = (screening + interview + offer) / total
    // Offer rate (interview success rate) = (offer) / (interview + offer)
    const totalJobs = jobs.length
    const interviewCount = statusCounts.interview + statusCounts.offer
    const offerCount = statusCounts.offer

    const interviewSuccessRate = interviewCount > 0 
      ? Math.round((offerCount / interviewCount) * 100)
      : 0

    res.json({
      statusCounts,
      timelineData,
      metrics: {
        totalJobs,
        interviewSuccessRate,
        interviewCount,
        offerCount
      }
    })
  } catch (error) {
    console.error("GET analytics error:", error)
    res.status(500).json({ message: "Server error calculating analytics" })
  }
})

export default router
