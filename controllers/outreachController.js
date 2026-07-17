import User from "../models/User.js"
import Job from "../models/Job.js"
import OutreachTemplate from "../models/OutreachTemplate.js"
import aiOrchestrator from "../services/aiOrchestrator.js"

/**
 * Generate outreach template using GPT-5.5 model
 * POST /api/ai/outreach/generate
 */
export async function generateOutreach(req, res, next) {
  const { jobId, type, tone } = req.body

  try {
    if (!jobId || !type || !tone) {
      return res.status(400).json({ message: "jobId, type, and tone are required." })
    }

    const job = await Job.findOne({ _id: jobId, user: req.userId })
    if (!job) {
      return res.status(404).json({ message: "Job application not found." })
    }

    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: "User not found." })
    }

    const profilePayload = {
      name: user.name,
      phone: user.phone,
      headline: user.headline,
      bio: user.bio,
      skills: user.skills,
      education: user.education,
      experience: user.experience,
      projects: user.projects,
      certifications: user.certifications
    }

    const prompt = `
You are an expert copywriter and professional career development coach.
Draft a highly tailored "${type}" written in a "${tone}" tone.
Align it specifically with the target job details and incorporating details from the user's Master Career Profile.
Factual correctness is mandatory: only write copy that reflects actual experiences, skills, and background details from the user's profile. Never make up achievements or fake metrics.

User Master Career Profile:
${JSON.stringify(profilePayload)}

Target Job Details:
Company: ${job.company}
Position: ${job.role}
Job Description:
${job.jobDescription}

Generate the draft. For templates that require subject lines (e.g. Email, Cold Email, Follow-up, Thank You Email), create a compelling subject line.
Output a single JSON object containing:
1. "subject": string (subject line if applicable, else empty string)
2. "content": string (the complete drafted outreach text formatted in clean markdown/text)

Return ONLY valid raw JSON starting with '{' and ending with '}'. Do not include markdown code block tags or reasoning segments.
`
    const messages = [
      { role: "system", content: "You are a precise outreach content writer returning raw JSON." },
      { role: "user", content: prompt }
    ]

    console.log(`AI Outreach: Invoking GPT-5.5 for task "${type === "Cover Letter" ? "cover-letters" : "emails"}"...`)
    const rawResponse = await aiOrchestrator.execute(
      type === "Cover Letter" ? "cover-letters" : "emails",
      messages
    )

    let cleaned = rawResponse.trim()
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "").trim()
    }

    try {
      const parsed = JSON.parse(cleaned)
      res.json(parsed)
    } catch (parseError) {
      console.error("Failed to parse GPT-5.5 outreach response:", cleaned, parseError)
      res.status(500).json({
        message: "Failed to parse AI outreach response. Please try again.",
        rawResponse
      })
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Save outreach template to MongoDB
 * POST /api/ai/outreach/save
 */
export async function saveOutreach(req, res, next) {
  const { jobId, type, tone, subject, content } = req.body

  try {
    if (!jobId || !type || !tone || !content) {
      return res.status(400).json({ message: "jobId, type, tone, and content are required to save." })
    }

    const job = await Job.findOne({ _id: jobId, user: req.userId })
    if (!job) {
      return res.status(404).json({ message: "Job application not found." })
    }

    const outreach = new OutreachTemplate({
      user: req.userId,
      job: jobId,
      company: job.company,
      position: job.role,
      type,
      tone,
      subject: subject || "",
      content
    })

    await outreach.save()
    res.json(outreach)
  } catch (error) {
    next(error)
  }
}

/**
 * Get histories for a job
 * GET /api/ai/outreach/:jobId
 */
export async function getOutreachHistories(req, res, next) {
  const { jobId } = req.params

  try {
    const histories = await OutreachTemplate.find({
      user: req.userId,
      job: jobId
    }).sort({ createdAt: -1 })
    
    res.json(histories)
  } catch (error) {
    next(error)
  }
}

/**
 * Delete an outreach history entry
 * DELETE /api/ai/outreach/:id
 */
export async function deleteOutreach(req, res, next) {
  const { id } = req.params

  try {
    const result = await OutreachTemplate.findOneAndDelete({
      _id: id,
      user: req.userId
    })

    if (!result) {
      return res.status(404).json({ message: "Outreach template not found or unauthorized." })
    }

    res.json({ message: "Outreach template deleted successfully." })
  } catch (error) {
    next(error)
  }
}
