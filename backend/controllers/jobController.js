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
    checklist,
    recruiterName,
    recruiterEmail,
    recruiterPhone,
    matchScore,
    resumeVersion,
    coverLetter,
    timeline
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
      checklist: checklist || [],
      recruiterName: recruiterName || "",
      recruiterEmail: recruiterEmail || "",
      recruiterPhone: recruiterPhone || "",
      matchScore: matchScore || 0,
      resumeVersion: resumeVersion || "",
      coverLetter: coverLetter || "",
      timeline: timeline || []
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
    checklist,
    recruiterName,
    recruiterEmail,
    recruiterPhone,
    matchScore,
    resumeVersion,
    coverLetter,
    timeline
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
    if (recruiterName !== undefined) job.recruiterName = recruiterName
    if (recruiterEmail !== undefined) job.recruiterEmail = recruiterEmail
    if (recruiterPhone !== undefined) job.recruiterPhone = recruiterPhone
    if (matchScore !== undefined) job.matchScore = matchScore
    if (resumeVersion !== undefined) job.resumeVersion = resumeVersion
    if (coverLetter !== undefined) job.coverLetter = coverLetter
    if (timeline !== undefined) job.timeline = timeline

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

    res.json({ message: "Job deleted successfully" })
  } catch (error) {
    next(error)
  }
}

/**
 * Get job analytics summary
 * GET /api/jobs/analytics
 */
export async function getAnalytics(req, res, next) {
  try {
    const jobs = await Job.find({ user: req.userId })

    const statusCounts = {
      saved: 0,
      applied: 0,
      oa: 0,
      interview: 0,
      hr: 0,
      offer: 0,
      rejected: 0,
      withdrawn: 0
    }

    jobs.forEach(job => {
      const s = job.status ? job.status.toLowerCase() : ""
      if (statusCounts[s] !== undefined) {
        statusCounts[s]++
      }
    })

    const totalJobs = jobs.length
    const offerCount = statusCounts.offer || 0
    const interviewCount = statusCounts.interview || 0
    const interviewSuccessRate = interviewCount > 0 ? (offerCount / interviewCount) * 100 : 0

    res.json({
      statusCounts,
      metrics: {
        totalJobs,
        interviewCount,
        offerCount,
        interviewSuccessRate
      },
      timelineData: jobs.map(j => ({
        id: j._id,
        role: j.role,
        company: j.company,
        status: j.status,
        updatedAt: j.updatedAt
      }))
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update checklist item (toggle)
 * PUT /api/jobs/:id/checklist
 */
export async function updateChecklist(req, res, next) {
  const { checklist } = req.body

  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { checklist },
      { new: true }
    )

    if (!job) {
      return res.status(404).json({ message: "Job not found or unauthorized" })
    }

    res.json(job.checklist)
  } catch (error) {
    next(error)
  }
}
