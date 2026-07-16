import Job from "../models/Job.js"

/**
 * Get all jobs for logged-in user
 * GET /api/jobs
 */
export async function getJobs(req, res, next) {
  try {
    const jobs = await Job.find({ user: req.userId }).sort({ createdAt: -1 })
    res.json(jobs)
  } catch (error) {
    next(error)
  }
}

/**
 * Create a job application
 * POST /api/jobs
 */
export async function createJob(req, res, next) {
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
    next(error)
  }
}

/**
 * Update a job application
 * PUT /api/jobs/:id
 */
export async function updateJob(req, res, next) {
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
    next(error)
  }
}

/**
 * Delete a job application
 * DELETE /api/jobs/:id
 */
export async function deleteJob(req, res, next) {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, user: req.userId })

    if (!job) {
      return res.status(404).json({ message: "Job not found or unauthorized" })
    }

    res.json({ message: "Job removed successfully" })
  } catch (error) {
    next(error)
  }
}

/**
 * Update/toggle/add/remove checklist items for a job
 * PUT /api/jobs/:id/checklist
 */
export async function updateChecklist(req, res, next) {
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
    next(error)
  }
}

/**
 * Get aggregated job statistics
 * GET /api/jobs/analytics
 */
export async function getAnalytics(req, res, next) {
  try {
    const jobs = await Job.find({ user: req.userId })

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
    next(error)
  }
}
