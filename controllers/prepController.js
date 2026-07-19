import User from "../models/User.js"
import Job from "../models/Job.js"
import InterviewPrep from "../models/InterviewPrep.js"
import aiOrchestrator from "../services/aiOrchestrator.js"

/**
 * Generate Interview Prep Guide via Claude Sonnet Thinking
 * POST /api/prep/generate
 */
export async function generatePrep(req, res, next) {
  const { jobId } = req.body

  try {
    if (!jobId) {
      return res.status(400).json({ message: "jobId is required to generate prep guide." })
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
      headline: user.headline,
      bio: user.bio,
      skills: user.skills,
      education: user.education,
      experience: user.experience,
      projects: user.projects,
      certifications: user.certifications
    }

    const prompt = `
You are an elite interview coach and tech recruiter.
Develop a comprehensive, professional interview study guide tailored specifically to this job application and user's profile.
Generate content for exactly these 7 sections:
1. "Company Research": In-depth analysis of target company, products, recent news, culture, and likely interview focus.
2. "Behavioral Questions": 3-4 likely behavioral/STAR-format interview questions, with structured outlines of how the user should answer based on their projects/experience.
3. "Resume Questions": 3-4 deep technical questions probing details of the user's specific experience/projects, and what keywords they must emphasize.
4. "Coding Questions": Key algorithm/DSA topics, 2-3 specific LeetCode/CodeChef challenges typical for this role level, and step-by-step logic summaries.
5. "System Design": Likely high-level architectural design challenges (e.g. rate limiter, URL shortener) with diagrams structure and scaling talking points.
6. "Salary Negotiation": Expected compensation ranges, market stats, and 3-4 custom negotiation talking script points matching the user's expertise.
7. "30 Minute Revision Guide": Summary bullets of core languages, frameworks, behavioral templates, and algorithms to review in the final 30 minutes.

Factual correctness is mandatory: base behavioral and resume sections strictly on the user's actual profile details. Never invent achievements or companies.

User Profile:
${JSON.stringify(profilePayload)}

Target Job:
Company: ${job.company}
Position: ${job.role}
Job Description:
${job.jobDescription}

Perform the prep synthesis and output a single JSON object containing:
1. "sections": Array of object { "title": string, "content": string (markdown text of study guide contents) }
   The title values must exactly match the 7 section names: "Company Research", "Behavioral Questions", "Resume Questions", "Coding Questions", "System Design", "Salary Negotiation", "30 Minute Revision Guide".

Return ONLY valid raw JSON starting with '{' and ending with '}'. Do not include markdown code blocks.
`
    const messages = [
      { role: "system", content: "You are a precise interview preparation assistant returning raw JSON." },
      { role: "user", content: prompt }
    ]

    console.log("AI Prep: Invoking Claude Sonnet Thinking model...")
    const rawResponse = await aiOrchestrator.execute("interview-prep", messages)

    let cleaned = rawResponse.trim()
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "").trim()
    }

    let parsed
    try {
      const sanitized = cleaned.replace(/\\(?!["\\/bfnrtu])/g, "\\\\")
      parsed = JSON.parse(sanitized)
    } catch (parseError) {
      console.error("Failed to parse Claude interview prep response:", cleaned, parseError)
      return res.status(500).json({
        message: "Failed to parse AI interview prep response. Please try again.",
        rawResponse
      })
    }

    // Upsert session (one prep guide session per job application)
    let prepSession = await InterviewPrep.findOne({ user: req.userId, job: jobId })
    if (prepSession) {
      prepSession.sections = parsed.sections || []
      await prepSession.save()
    } else {
      prepSession = new InterviewPrep({
        user: req.userId,
        job: jobId,
        company: job.company,
        position: job.role,
        sections: parsed.sections || []
      })
      await prepSession.save()
    }

    res.json(prepSession)
  } catch (error) {
    next(error)
  }
}

/**
 * Fetch Interview Prep guide for a job
 * GET /api/prep/:jobId
 */
export async function getPrep(req, res, next) {
  const { jobId } = req.params

  try {
    const session = await InterviewPrep.findOne({ user: req.userId, job: jobId })
    res.json(session)
  } catch (error) {
    next(error)
  }
}

/**
 * Save user overrides/edits to sections
 * PUT /api/prep/:id
 */
export async function updatePrep(req, res, next) {
  const { id } = req.params
  const { sections } = req.body

  try {
    const session = await InterviewPrep.findOneAndUpdate(
      { _id: id, user: req.userId },
      { sections },
      { new: true }
    )

    if (!session) {
      return res.status(404).json({ message: "Prep session not found or unauthorized." })
    }

    res.json(session)
  } catch (error) {
    next(error)
  }
}

/**
 * Delete a prep session
 * DELETE /api/prep/:id
 */
export async function deletePrep(req, res, next) {
  const { id } = req.params

  try {
    const result = await InterviewPrep.findOneAndDelete({
      _id: id,
      user: req.userId
    })

    if (!result) {
      return res.status(404).json({ message: "Prep session not found or unauthorized." })
    }

    res.json({ message: "Prep session deleted successfully." })
  } catch (error) {
    next(error)
  }
}
