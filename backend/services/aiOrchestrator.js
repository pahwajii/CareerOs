import aiService from "./aiService.js"

const FORGE_DEFAULT_BASE_URL = "https://forge-gateway-api.fly.dev/v1"
const OMNIROUTE_DEFAULT_BASE_URL = "http://localhost:20128/v1"

function isOmniRouteConfigured() {
  return Boolean(process.env.OMNIROUTE_BASE_URL || process.env.OMNIROUTE_API_KEY || process.env.OMNIROUTE_MODEL)
}

class AIOrchestrator {
  getGatewayConfig(defaultForgeModel, defaultOmniRouteModel = "auto") {
    if (isOmniRouteConfigured()) {
      return {
        apiKey: process.env.OMNIROUTE_API_KEY || process.env.FORGE_API_KEY,
        baseUrl: process.env.OMNIROUTE_BASE_URL || OMNIROUTE_DEFAULT_BASE_URL,
        model: process.env.OMNIROUTE_MODEL || defaultOmniRouteModel
      }
    }

    return {
      apiKey: process.env.FORGE_API_KEY,
      baseUrl: process.env.FORGE_BASE_URL || FORGE_DEFAULT_BASE_URL,
      model: defaultForgeModel
    }
  }

  getModelForTask(taskType) {
    // Select model based on task specifications from skills.md
    switch (taskType) {
      case "resume-tailoring":
      case "ats-analysis":
      case "interview-prep":
        return this.getGatewayConfig("gpt-5.6-sol", "auto/coding") // Quality-first models for resume writing and prep
      case "gap-analysis":
        return this.getGatewayConfig("deepseek-r1", "auto")
      case "resume-parsing":
      case "job-parsing":
      case "portfolio-parsing":
      case "profile-merging":
      case "profile-building":
        return this.getGatewayConfig("gpt-5.6-luna", "auto/fast") // Fast structured extraction
      case "github-analysis":
        return this.getGatewayConfig("kimi-k2.7-code", "auto/coding")
      case "cover-letters":
      case "emails":
        return this.getGatewayConfig("gpt-5.6-terra", "auto") // High quality, balanced for text drafting
      default:
        return this.getGatewayConfig("gpt-5.6-sol", "auto")
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
      } else if (isOmniRouteConfigured()) {
        key = process.env.OMNIROUTE_API_KEY || process.env.FORGE_API_KEY
        url = process.env.OMNIROUTE_BASE_URL || OMNIROUTE_DEFAULT_BASE_URL
      } else {
        key = process.env.FORGE_API_KEY
        url = process.env.FORGE_BASE_URL || FORGE_DEFAULT_BASE_URL
      }
    }

    if (!key) {
      key = process.env.OMNIROUTE_API_KEY || process.env.FORGE_API_KEY || process.env.GEMINI_API_KEY
    }
    if (!url) {
      url = process.env.OMNIROUTE_BASE_URL || process.env.FORGE_BASE_URL || FORGE_DEFAULT_BASE_URL
    }

    // Opus gets 5-minute timeout — all other models get 3-minute timeout
    const timeoutMs = (customModel || config.model).includes("opus") ? 300000 : 180000


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
