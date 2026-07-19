const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

if (!import.meta.env.VITE_API_URL) {
  console.warn("⚠️ [Vite API Config]: VITE_API_URL is undefined in the environment. Defaulting to local port 5000 API gateway.")
}

// Fetch helper configuration
const getHeaders = (isMultipart = false) => {
  const token = localStorage.getItem("token")
  const headers = {}
  
  if (!isMultipart) {
    headers["Content-Type"] = "application/json"
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  
  return headers
}

// Global centralized request interceptor
const request = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`
  const headers = getHeaders(options.body instanceof FormData)
  
  const config = {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  }

  try {
    const response = await fetch(url, config)
    
    // Auto-logout user if token is expired/invalid (401 Unauthorized)
    if (response.status === 401) {
      console.warn("⚠️ API Warning: Authorization token is invalid or has expired. Redirecting to login.")
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      if (window.location.pathname !== "/login") {
        window.location.href = "/login"
      }
      throw new Error("Your session has expired. Please log in again.")
    }

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP Request failed with status ${response.status}`)
    }
    
    return data
  } catch (error) {
    console.error(`❌ API Request Exception [${options.method || "GET"} ${endpoint}]:`, error.message)
    throw error
  }
}

export const api = {
  // Auth API
  login: async (email, password) => {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    })
  },
  
  signup: async (name, email, password) => {
    return request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    })
  },

  // Jobs API
  getJobs: async () => {
    return request("/jobs")
  },

  createJob: async (jobData) => {
    return request("/jobs", {
      method: "POST",
      body: JSON.stringify(jobData)
    })
  },

  updateJob: async (id, jobData) => {
    return request(`/jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify(jobData)
    })
  },

  deleteJob: async (id) => {
    return request(`/jobs/${id}`, {
      method: "DELETE"
    })
  },

  // Checklist API
  updateChecklist: async (id, checklist) => {
    return request(`/jobs/${id}/checklist`, {
      method: "PUT",
      body: JSON.stringify({ checklist })
    })
  },

  // Analytics API
  getAnalytics: async () => {
    return request("/jobs/analytics")
  },

  // Master Career Profile API
  getProfile: async () => {
    return request("/profile")
  },

  updateProfile: async (profileData) => {
    return request("/profile", {
      method: "PUT",
      body: JSON.stringify(profileData)
    })
  },

  uploadResumeFile: async (formData) => {
    return request("/profile/upload-resume", {
      method: "POST",
      body: formData
    })
  },

  uploadPortfolioFile: async (formData) => {
    return request("/profile/upload-portfolio", {
      method: "POST",
      body: formData
    })
  },

  buildProfileStream: async (onChunk) => {
    const token = localStorage.getItem("token")
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
    const response = await fetch(`${baseUrl}/profile/build`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || "Failed to trigger AI profile builder")
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop()
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const chunk = JSON.parse(line.trim())
            onChunk(chunk)
          } catch (err) {
            console.error("Failed to parse chunk line:", line, err)
          }
        }
      }
    }
  },

  // Backward compatibility aliases
  uploadResume: async (formData) => {
    return request("/profile/upload-resume", {
      method: "POST",
      body: formData
    })
  },

  // Gemini AI API
  generatePrep: async (jobId) => {
    return request("/ai/prep", {
      method: "POST",
      body: JSON.stringify({ jobId })
    })
  },

  analyzeResume: async (resumeText, jobDescription) => {
    return request("/ai/resume-analyze", {
      method: "POST",
      body: JSON.stringify({ resumeText, jobDescription })
    })
  },

  matchAnalyze: async (jobDescription) => {
    return request("/ai/match-analyze", {
      method: "POST",
      body: JSON.stringify({ jobDescription })
    })
  },

  parseJobDescription: async (text) => {
    return request("/ai/parse-job", {
      method: "POST",
      body: JSON.stringify({ text })
    })
  },

  generateApplyAssist: async (jobId) => {
    return request("/ai/apply-assist", {
      method: "POST",
      body: JSON.stringify({ jobId })
    })
  },

  tailorResume: async (jobId, useModel = null) => {
    return request("/resume/tailor", {
      method: "POST",
      body: JSON.stringify({ jobId, useModel })
    })
  },

  getTailoredHistories: async (jobId) => {
    return request(`/resume/tailor/${jobId}`)
  },

  downloadTailoredFile: async (id, fileType) => {
    const token = localStorage.getItem("token")
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
    const response = await fetch(`${baseUrl}/resume/download/${fileType}/${id}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
    if (!response.ok) throw new Error("Failed to download file")
    return await response.blob()
  },

  // Outreach & Cover Letter API
  generateOutreach: async (jobId, type, tone) => {
    return request("/ai/outreach/generate", {
      method: "POST",
      body: JSON.stringify({ jobId, type, tone })
    })
  },

  saveOutreach: async (outreachData) => {
    return request("/ai/outreach/save", {
      method: "POST",
      body: JSON.stringify(outreachData)
    })
  },

  getOutreachHistories: async (jobId) => {
    return request(`/ai/outreach/${jobId}`)
  },

  deleteOutreach: async (id) => {
    return request(`/ai/outreach/${id}`, {
      method: "DELETE"
    })
  },

  // Interview Preparation API
  generatePrep: async (jobId) => {
    return request("/prep/generate", {
      method: "POST",
      body: JSON.stringify({ jobId })
    })
  },

  getPrep: async (jobId) => {
    return request(`/prep/${jobId}`)
  },

  updatePrep: async (id, sections) => {
    return request(`/prep/${id}`, {
      method: "PUT",
      body: JSON.stringify({ sections })
    })
  },

  deletePrep: async (id) => {
    return request(`/prep/${id}`, {
      method: "DELETE"
    })
  },

  // Playwright Browser Automation API
  automateApply: async (jobId) => {
    return request("/automate/apply", {
      method: "POST",
      body: JSON.stringify({ jobId })
    })
  }
}
