import aiService from "./aiService.js"

class AIOrchestrator {
  getModelForTask(taskType) {
    // Select model based on task specifications from skills.md
    switch (taskType) {
      case "resume-tailoring":
      case "ats-analysis":
      case "interview-prep":
        return {
          apiKey: process.env.FORGE_API_KEY,
          baseUrl: process.env.FORGE_BASE_URL || "https://forge-gateway-api.fly.dev/v1",
          model: "claude-sonnet-4-6"
        }
      case "gap-analysis":
        return {
          apiKey: process.env.FORGE_API_KEY,
          baseUrl: process.env.FORGE_BASE_URL || "https://forge-gateway-api.fly.dev/v1",
          model: "deepseek-r1"
        }
      case "resume-parsing":
      case "job-parsing":
      case "portfolio-parsing":
      case "profile-merging":
      case "profile-building":
        return {
          apiKey: process.env.GEMINI_API_KEY,
          baseUrl: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai",
          model: process.env.GEMINI_MODEL || "gemini-2.5-flash"
        }
      case "github-analysis":
        return {
          apiKey: process.env.FORGE_API_KEY,
          baseUrl: process.env.FORGE_BASE_URL || "https://forge-gateway-api.fly.dev/v1",
          model: "kimi-k2.7-code"
        }
      case "cover-letters":
      case "emails":
        return {
          apiKey: process.env.FORGE_API_KEY,
          baseUrl: process.env.FORGE_BASE_URL || "https://forge-gateway-api.fly.dev/v1",
          model: "gpt-5.5"
        }
      default:
        return {
          apiKey: process.env.FORGE_API_KEY,
          baseUrl: process.env.FORGE_BASE_URL || "https://forge-gateway-api.fly.dev/v1",
          model: process.env.FORGE_MODEL || "claude-sonnet-4-6"
        }
    }
  }

  async execute(taskType, messages, temperature = 0.2, customModel = null) {
    const config = this.getModelForTask(taskType)
    let modelName = customModel || config.model
    
    let key = config.apiKey
    let url = config.baseUrl

    // If custom model is specified, determine correct endpoint/keys automatically
    if (customModel) {
      if (customModel.includes("gemini")) {
        key = process.env.GEMINI_API_KEY
        url = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai"
      } else {
        key = process.env.FORGE_API_KEY
        url = process.env.FORGE_BASE_URL || "https://forge-gateway-api.fly.dev/v1"
      }
    }

    if (!key) {
      key = process.env.FORGE_API_KEY || process.env.GEMINI_API_KEY
    }
    if (!url) {
      url = process.env.FORGE_BASE_URL || "https://forge-gateway-api.fly.dev/v1"
    }

    // Dynamically adjust timeout based on task complexity (e.g. 3 minutes/180s for interview-prep)
    const timeoutMs = taskType === "interview-prep" ? 180000 : 90000

    try {
      console.log(`AI Orchestrator: Dispatching task "${taskType}" to model "${modelName}" with timeout ${timeoutMs}ms...`)
      return await aiService._executeRequest(key, url, modelName, messages, temperature, timeoutMs)
    } catch (error) {
      console.warn(`AI Orchestrator: Selected model ${modelName} failed for task ${taskType}. Falling back to general chat...`, error.message)
      // Fallback: use callChatCompletion (which will try Forge default model, then Gemini fallback)
      return await aiService.callChatCompletion(messages, temperature, timeoutMs)
    }
  }
}

export default new AIOrchestrator()
