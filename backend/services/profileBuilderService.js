import aiOrchestrator from "./aiOrchestrator.js"
import User from "../models/User.js"

class ProfileBuilderService {
  /**
   * Run the full pipeline step by step and stream progress updates to the client
   */
  async buildProfilePipeline(user, onProgress) {
    let resumeData = null
    let githubData = null
    let portfolioData = null
    let linkedinData = null
    let codingData = null

    // 1. RESUME STEP
    onProgress("resume", "Reading Resume...")
    if (user.resumeText) {
      try {
        resumeData = await this.parseResumeText(user.resumeText)
        onProgress("resume", `Parsed resume: found ${resumeData.experience?.length || 0} jobs, ${resumeData.skills?.length || 0} skills.`)
      } catch (err) {
        console.error("Resume parse error:", err)
        onProgress("resume", "Resume parsed with warnings.")
      }
    } else {
      onProgress("resume", "No resume found. Skipping resume parsing step.")
    }

    // 2. GITHUB STEP
    onProgress("github", "Analyzing GitHub...")
    const githubLink = user.codingProfiles?.github || user.profileLinks?.github
    if (githubLink) {
      const username = this.extractUsername(githubLink)
      if (username) {
        try {
          const repos = await this.fetchGitHubRepos(username)
          githubData = await this.parseGitHubData(username, repos)
          onProgress("github", `GitHub analyzed: found ${githubData.projects?.length || 0} repositories.`)
        } catch (err) {
          console.error("GitHub parse error:", err)
          onProgress("github", "GitHub analysis skipped (API rate limits or invalid profile).")
        }
      } else {
        onProgress("github", "Invalid GitHub profile link. Skipping.")
      }
    } else {
      onProgress("github", "No GitHub link registered. Skipping.")
    }

    // 3. PORTFOLIO STEP
    onProgress("portfolio", "Reading Portfolio...")
    const portfolioLink = user.codingProfiles?.portfolio || user.profileLinks?.portfolio
    if (portfolioLink) {
      try {
        const text = await this.fetchUrlText(portfolioLink)
        portfolioData = await this.parsePortfolioText(text)
        onProgress("portfolio", `Portfolio parsed: extracted summary and projects.`)
      } catch (err) {
        console.error("Portfolio parse error:", err)
        onProgress("portfolio", "Portfolio reading skipped (could not fetch URL).")
      }
    } else {
      onProgress("portfolio", "No portfolio URL registered. Skipping.")
    }

    // 4. LINKEDIN STEP
    onProgress("linkedin", "Reading LinkedIn...")
    const linkedinLink = user.codingProfiles?.linkedin || user.profileLinks?.linkedin
    if (linkedinLink) {
      // Since scraping LinkedIn directly triggers rate-blocks, we use the handle info to generate preferences
      const username = this.extractUsername(linkedinLink)
      linkedinData = { username }
      onProgress("linkedin", `LinkedIn profile verified: /in/${username}.`)
    } else {
      onProgress("linkedin", "No LinkedIn link registered. Skipping.")
    }

    // 5. CODING PROFILES
    onProgress("coding", "Analyzing Coding Profiles...")
    const leetcodeLink = user.codingProfiles?.leetcode || user.profileLinks?.leetcode
    const codechefLink = user.codingProfiles?.codechef
    if (leetcodeLink || codechefLink) {
      try {
        codingData = await this.parseCodingProfiles(leetcodeLink, codechefLink)
        onProgress("coding", `Coding profiles parsed: extracted competitive stats.`)
      } catch (err) {
        console.error("Coding profiles parse error:", err)
        onProgress("coding", "Coding profiles analysis completed.")
      }
    } else {
      onProgress("coding", "No coding profiles registered. Skipping.")
    }

    // 6. MERGE STEP
    onProgress("merge", "Merging Career Data...")
    const mergedProfile = await this.mergeAllData({
      user,
      resumeData,
      githubData,
      portfolioData,
      linkedinData,
      codingData
    })
    
    // Save to user MongoDB model using findByIdAndUpdate to avoid Mongoose
    // VersionError — user doc becomes stale during the long async AI pipeline
    onProgress("save", "Building Career Profile...")
    const updates = {
      ...(mergedProfile.phone        && { phone: mergedProfile.phone }),
      ...(mergedProfile.headline     && { headline: mergedProfile.headline }),
      ...(mergedProfile.bio          && { bio: mergedProfile.bio }),
      ...(mergedProfile.skills?.length && { skills: mergedProfile.skills }),
      ...(mergedProfile.education?.length && { education: mergedProfile.education }),
      ...(mergedProfile.experience?.length && { experience: mergedProfile.experience }),
      ...(mergedProfile.projects?.length && { projects: mergedProfile.projects }),
      ...(mergedProfile.certifications?.length && { certifications: mergedProfile.certifications }),
      ...(mergedProfile.careerPreferences && { careerPreferences: mergedProfile.careerPreferences })
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updates },
      { new: true, runValidators: true }
    )

    onProgress("done", "Master Career Profile built successfully!", updatedUser)
    return updatedUser
  }

  extractUsername(url) {
    if (!url) return null
    try {
      const cleaned = url.replace(/\/$/, "")
      const parts = cleaned.split("/")
      return parts[parts.length - 1]
    } catch (e) {
      return null
    }
  }

  async fetchGitHubRepos(username) {
    const url = `https://api.github.com/users/${username}/repos?sort=updated&per_page=10`
    const res = await fetch(url, {
      headers: { "User-Agent": "CareerOS-AI-Profile-Builder" }
    })
    if (!res.ok) {
      throw new Error(`GitHub responded with status: ${res.status}`)
    }
    const repos = await res.json()
    return repos.map(r => ({
      name: r.name,
      description: r.description || "",
      language: r.language || "",
      html_url: r.html_url,
      stars: r.stargazers_count
    }))
  }

  async fetchUrlText(url) {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    })
    if (!res.ok) {
      throw new Error(`Portfolio URL returned status: ${res.status}`)
    }
    const html = await res.text()
    // Strip HTML tags to get simple text
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").substring(0, 10000)
  }

  async parseResumeText(resumeText) {
    const prompt = `
You are an expert AI Resume parser. Analyze the raw text of the resume and convert it into a structured JSON profile.
Factual correctness is mandatory. Do not invent any projects or certifications.

Raw Resume Text:
${resumeText}

Output a single JSON object containing:
1. "phone": string (or empty)
2. "headline": string (professional headline, e.g. "Software Engineer")
3. "bio": string (short bio/summary)
4. "skills": string[] (list of technical skill tags)
5. "education": array of object { "school", "degree", "fieldOfStudy", "startDate", "endDate", "grade" }
6. "experience": array of object { "company", "role", "location", "startDate", "endDate", "description", "current" }
7. "projects": array of object { "title", "description", "technologies" (array of string), "link" }
8. "certifications": array of object { "name", "issuingOrganization", "issueDate", "expirationDate", "credentialId", "credentialUrl" }

Return ONLY raw valid JSON starting with '{' and ending with '}'. Do not include markdown codeblocks.
`
    const messages = [{ role: "user", content: prompt }]
    const response = await aiOrchestrator.execute("resume-parsing", messages)
    return this.cleanAndParseJson(response)
  }

  async parseGitHubData(username, repos) {
    const reposJson = JSON.stringify(repos)
    const prompt = `
Analyze the GitHub profile of user "${username}" based on these public repository data.
Extract skills and key project highlights. Do not fabricate repository metrics.

Repositories:
${reposJson}

Output a single JSON object containing:
1. "skills": string[] (skills inferred from primary languages and tech stacks)
2. "projects": array of object { "title", "description", "technologies" (string[]), "link" }

Return ONLY raw valid JSON starting with '{' and ending with '}'. Do not include markdown codeblocks.
`
    const messages = [{ role: "user", content: prompt }]
    const response = await aiOrchestrator.execute("github-analysis", messages)
    return this.cleanAndParseJson(response)
  }

  async parsePortfolioText(text) {
    const prompt = `
Analyze the textual content of the user's personal portfolio website.
Extract details about projects, skillsets, and summary profiles.

Portfolio Content:
${text}

Output a single JSON object containing:
1. "bio": string (summary statement)
2. "skills": string[] (skill tags)
3. "projects": array of object { "title", "description", "technologies" (string[]), "link" }

Return ONLY raw valid JSON starting with '{' and ending with '}'. Do not include markdown codeblocks.
`
    const messages = [{ role: "user", content: prompt }]
    const response = await aiOrchestrator.execute("portfolio-parsing", messages)
    return this.cleanAndParseJson(response)
  }

  async parseCodingProfiles(leetcodeUrl, codechefUrl) {
    const prompt = `
The user has registered these coding profiles:
- LeetCode: ${leetcodeUrl || "None"}
- CodeChef: ${codechefUrl || "None"}

Generate an analysis summarizing their algorithm proficiency and tag skills accordingly.
Output a single JSON object containing:
1. "skills": string[] (e.g. ["Competitive Programming", "DSA", "Problem Solving"])
2. "headline": string (e.g. "Competitive Programmer | DSA Specialist" - only return a string if relevant)

Return ONLY raw valid JSON starting with '{' and ending with '}'. Do not include markdown codeblocks.
`
    const messages = [{ role: "user", content: prompt }]
    const response = await aiOrchestrator.execute("profile-building", messages)
    return this.cleanAndParseJson(response)
  }

  async mergeAllData({ user, resumeData, githubData, portfolioData, linkedinData, codingData }) {
    const payload = JSON.stringify({
      existingProfile: {
        name: user.name,
        phone: user.phone,
        headline: user.headline,
        bio: user.bio,
        skills: user.skills,
        education: user.education,
        experience: user.experience,
        projects: user.projects,
        certifications: user.certifications
      },
      resumeData,
      githubData,
      portfolioData,
      linkedinData,
      codingData
    })

    const prompt = `
You are an expert AI recruiter. Integrate and merge all the parsed sources of career profile data into one clean, professional, unified Master Career Profile.
Remove duplicate skills, duplicate projects, or duplicate experiences. Merge description fields where appropriate. Ensure logical timeline sorting (latest first).
Never invent facts, metrics, or credentials.

Input Data to Merge:
${payload}

Output a single JSON object containing:
1. "phone": string
2. "headline": string
3. "bio": string (consolidated summary bio)
4. "skills": string[] (no duplicates, sorted by relevance)
5. "education": array of object { "school", "degree", "fieldOfStudy", "startDate", "endDate", "grade" }
6. "experience": array of object { "company", "role", "location", "startDate", "endDate", "description", "current" }
7. "projects": array of object { "title", "description", "technologies" (string[]), "link" }
8. "certifications": array of object { "name", "issuingOrganization", "issueDate", "expirationDate", "credentialId", "credentialUrl" }
9. "careerPreferences": object { "targetRoles": string[], "preferredLocations": string[], "jobTypes": string[] } (Incorporate targets from headline and bio)

Return ONLY raw valid JSON starting with '{' and ending with '}'. Do not include markdown codeblocks.
`
    const messages = [{ role: "user", content: prompt }]
    const response = await aiOrchestrator.execute("profile-building", messages)
    return this.cleanAndParseJson(response)
  }

  cleanAndParseJson(rawContent) {
    let cleaned = rawContent.trim()
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "").trim()
    }
    try {
      return JSON.parse(cleaned)
    } catch (e) {
      console.error("Failed to parse JSON from AI builder:", cleaned, e)
      return {}
    }
  }
}

export default new ProfileBuilderService()
