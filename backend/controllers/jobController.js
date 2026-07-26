import Job from "../models/Job.js"
import * as XLSX from "xlsx"


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

/**
 * Parse uploaded Excel (.xlsx, .xls) or CSV sheet buffer and return extracted job listings
 * POST /api/jobs/import-excel
 */
export async function importExcelJobs(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "Please upload a valid Excel or CSV file." })
    }

    // Read sheet workbook from file buffer
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return res.status(400).json({ message: "Workbook contains no readable worksheets." })
    }

    const sheet = workbook.Sheets[sheetName]
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" })

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ message: "No data rows found in the uploaded file." })
    }

    // Flexible column matchers
    const companyKeywords = ["company", "organization", "employer", "firm", "company name", "org"]
    const roleKeywords = ["role", "title", "job title", "position", "designation", "job role", "job name", "job"]
    const urlKeywords = ["url", "link", "apply link", "job url", "job link", "website", "application link", "apply url"]
    const locationKeywords = ["location", "city", "work type", "remote", "place", "site"]
    const salaryKeywords = ["salary", "compensation", "pay", "stipend", "package", "remuneration", "expected salary", "ctc"]
    const descKeywords = ["description", "jd", "job description", "details", "requirements", "notes", "summary"]

    const parsedJobs = rawRows.map((row, index) => {
      const company = findField(row, companyKeywords)
      const role = findField(row, roleKeywords)
      const url = findField(row, urlKeywords)
      const location = findField(row, locationKeywords)
      const salary = findField(row, salaryKeywords)
      const jobDescription = findField(row, descKeywords)

      // Fallback: If no dedicated company/role found, extract best effort strings from any string fields
      let finalCompany = company
      let finalRole = role
      if (!finalCompany && !finalRole) {
        const values = Object.values(row).map(v => String(v).trim()).filter(Boolean)
        finalCompany = values[0] || `Company #${index + 1}`
        finalRole = values[1] || "Job Opening"
      } else if (!finalCompany) {
        finalCompany = "Target Company"
      } else if (!finalRole) {
        finalRole = "Job Opening"
      }

      return {
        id: `imported_${Date.now()}_${index}`,
        company: finalCompany,
        role: finalRole,
        url,
        location,
        salary,
        jobDescription,
        status: "saved"
      }
    })

    res.json({
      success: true,
      count: parsedJobs.length,
      jobs: parsedJobs
    })
  } catch (error) {
    console.error("Excel Parsing Error:", error)
    next(error)
  }
}

function findField(row, keywords) {
  const keys = Object.keys(row)
  for (const keyword of keywords) {
    const matchedKey = keys.find(k => {
      const lowerKey = k.trim().toLowerCase()
      return lowerKey === keyword || lowerKey.includes(keyword)
    })
    if (matchedKey && row[matchedKey] !== undefined && String(row[matchedKey]).trim() !== "") {
      return String(row[matchedKey]).trim()
    }
  }
  return ""
}

/**
 * Batch create job applications in MongoDB
 * POST /api/jobs/batch-create
 */
export async function batchCreateJobs(req, res, next) {
  const { jobs } = req.body

  try {
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ message: "No jobs provided for batch creation." })
    }

    const jobDocs = jobs.map(j => ({
      user: req.userId,
      company: j.company || "Company",
      role: j.role || "Job Opening",
      status: j.status || "saved",
      salary: j.salary || "",
      location: j.location || "",
      url: j.url || "",
      notes: j.notes || "Imported via Excel Batch Upload",
      jobDescription: j.jobDescription || "",
      appliedDate: Date.now(),
      matchScore: j.matchScore || 0
    }))

    const inserted = await Job.insertMany(jobDocs)
    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} openings into CareerOS Tracker!`,
      jobs: inserted
    })
  } catch (error) {
    next(error)
  }
}

