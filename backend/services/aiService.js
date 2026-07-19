/**
 * AI Service for communicating with the ForgeAI Gateway (OpenAI compatible)
 */
class AIService {
  get apiKey() {
    return process.env.FORGE_API_KEY
  }

  get baseUrl() {
    return process.env.FORGE_BASE_URL || "https://forge-gateway-api.fly.dev/v1"
  }

  get model() {
    return process.env.FORGE_MODEL || "deepseek-r1"
  }

  /**
   * General purpose wrapper to call the OpenAI-compatible chat completion endpoint.
   * Degrades gracefully by falling back to Gemini if the primary provider fails.
   */
  async callChatCompletion(messages, temperature = 0.7, timeoutMs = 90000) {
    // 1. Try Primary Provider (ForgeAI)
    try {
      if (!this.apiKey) {
        throw new Error("FORGE_API_KEY is not defined in the environment.")
      }
      console.log(`AI Service: Attempting primary request using model ${this.model} with timeout ${timeoutMs}ms...`)
      return await this._executeRequest(this.apiKey, this.baseUrl, this.model, messages, temperature, timeoutMs)
    } catch (primaryError) {
      console.warn("AI Service: Primary AI Gateway call failed:", primaryError.message)

      // 2. Try Fallback Provider (Gemini API)
      const geminiKey = process.env.GEMINI_API_KEY
      if (geminiKey) {
        console.log("AI Service: Falling back to Google Gemini API (gemini-2.5-flash)...")
        const geminiUrl = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai"
        const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash"
        
        try {
          return await this._executeRequest(geminiKey, geminiUrl, geminiModel, messages, temperature, timeoutMs)
        } catch (fallbackError) {
          console.error("AI Service: Fallback Gemini API call also failed:", fallbackError.message)
          throw new Error(`AI service failed: Primary error: ${primaryError.message} | Fallback error: ${fallbackError.message}`)
        }
      } else {
        throw new Error(`AI service failed: ${primaryError.message} (No Gemini fallback key configured)`)
      }
    }
  }

  /**
   * Helper to perform raw OpenAI-compatible API requests
   */
  async _executeRequest(apiKey, baseUrl, model, messages, temperature, timeoutMs = 90000) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errText = await response.text()
        console.error(`AI Service API error (${response.status}):`, errText)
        throw new Error(`Gateway responded with status ${response.status}: ${errText || response.statusText}`)
      }

      const data = await response.json()
      if (!data.choices || data.choices.length === 0) {
        throw new Error("Gateway returned an empty choice list.")
      }

      return data.choices[0].message.content
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === "AbortError") {
        console.error(`AI Service Timeout: The request took longer than ${timeoutMs / 1000} seconds.`)
        throw new Error("The AI service request timed out. Please try again.")
      }
      console.error("AI Service Exception:", error.message)
      throw error
    }
  }

  /**
   * Generates outreach email draft and interview prep tips.
   */
  async generatePrep(role, company, jobDescription) {
    const prompt = `
You are an expert career coach.
Create:
1. A professional cold outreach/follow-up email draft tailored for:
   - Role: ${role}
   - Company: ${company}
2. Concrete, actionable interview prep tips (3-5 tips) tailored to this specific role and the job description.

Job Description:
${jobDescription || "Not provided."}

Return the response in a structured and well-formatted markdown output. Make it look professional and ready to copy.
`

    const messages = [
      { role: "system", content: "You are a helpful, professional career development assistant." },
      { role: "user", content: prompt }
    ]

    return await this.callChatCompletion(messages)
  }

  /**
   * Analyzes resume text against a job description.
   * Returns a JSON object with:
   * - matchScore: number (0-100)
   * - missingKeywords: string[]
   * - tailoringSuggestions: string[]
   */
  async analyzeResume(resumeText, jobDescription) {
    const prompt = `
You are an expert ATS (Applicant Tracking System) optimizer and recruiter.
Analyze the following user resume text against the provided job description.

User Resume:
${resumeText || "No resume uploaded yet."}

Job Description:
${jobDescription || "No job description provided."}

Evaluate the fit and output a JSON object containing:
1. "matchScore": An integer between 0 and 100 representing the match percentage.
2. "missingKeywords": An array of important keywords/skills from the job description that are missing or weak in the resume.
3. "tailoringSuggestions": An array of 3 to 5 concrete, actionable suggestions on how to improve the resume to match the job.

CRITICAL: Return ONLY a valid JSON object. Do not include markdown code block styling like \`\`\`json or \`\`\`. Do not include any introductory or concluding text. Your response must start with '{' and end with '}'.

Example output format:
{
  "matchScore": 75,
  "missingKeywords": ["Kubernetes", "CI/CD pipelines", "Golang"],
  "tailoringSuggestions": [
    "Add details about your Golang projects in the Experience section.",
    "Mention specific Kubernetes containerization experience.",
    "Quantify your backend optimization achievements with metric percentages."
  ]
}
`

    const messages = [
      { role: "system", content: "You are a precise ATS scanner that outputs strictly formatted JSON." },
      { role: "user", content: prompt }
    ]

    const rawContent = await this.callChatCompletion(messages, 0.2) // Low temperature for consistency
    
    // Defensive parsing: Clean markdown code blocks if the model generated them anyway
    let cleaned = rawContent.trim()
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "").trim()
    }

    try {
      const parsed = JSON.parse(cleaned)
      
      // Ensure properties exist
      return {
        matchScore: typeof parsed.matchScore === "number" ? parsed.matchScore : 50,
        missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
        tailoringSuggestions: Array.isArray(parsed.tailoringSuggestions) ? parsed.tailoringSuggestions : ["Tailor your experiences to reflect keywords from the job description."]
      }
    } catch (parseError) {
      console.error("Defensive Parsing Failed for content:", cleaned, parseError)
      // Return a structured default if parsing failed
      return {
        matchScore: 0,
        missingKeywords: ["Parsing Error"],
        tailoringSuggestions: [
          "Could not parse the AI response format. Please try again.",
          "Original AI response began with: " + rawContent.substring(0, 100) + "..."
        ]
      }
    }
  }

  /**
   * Drafts a tailored cover letter and a "why this company" answer.
   */
  async generateApplyAssist(resumeText, role, company, jobDescription) {
    const prompt = `
You are an expert copywriter and career coach.
Using the following user resume and job description, write:
1. A tailored cover letter (approx. 250-350 words) for the role of ${role} at ${company}.
2. A compelling answer (approx. 100-150 words) to the common interview question: "Why do you want to work at ${company}?"

User Resume:
${resumeText || "No resume uploaded. Draft based on general experience matching the job."}

Job Description:
${jobDescription || "No job description provided."}

Return the response in structured and professional markdown, separating the Cover Letter and the "Why This Company" section clearly.
`

    const messages = [
      { role: "system", content: "You are a professional writing coach who drafts compelling career materials." },
      { role: "user", content: prompt }
    ]

    return await this.callChatCompletion(messages)
  }
}

export default new AIService()
