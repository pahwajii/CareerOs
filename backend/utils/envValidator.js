/**
 * Utility to validate critical environment variables on startup.
 * Throws clean error descriptions instead of crashing silently later.
 */
export function validateEnv() {
  const required = [
    "MONGO_URI",
    "JWT_SECRET"
  ]

  const missing = []

  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key)
    }
  })

  const hasAiGateway =
    process.env.FORGE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OMNIROUTE_BASE_URL ||
    process.env.OMNIROUTE_HOSTPORT ||
    process.env.OMNIROUTE_API_KEY ||
    process.env.OMNIROUTE_MODEL

  if (!hasAiGateway) {
    missing.push("FORGE_API_KEY or GEMINI_API_KEY or OMNIROUTE_BASE_URL")
  }

  if (missing.length > 0) {
    console.error("❌ CRITICAL: Missing required environment variables:")
    missing.forEach(key => {
      console.error(`   - ${key}`)
    })
    console.error("Please configure these in your backend .env file. Shutting down...\n")
    process.exit(1)
  }

  // Soft warning if PORT is fallback
  if (!process.env.PORT) {
    console.warn("⚠️  Warning: PORT is not set. Defaulting to port 5000.")
  }

  console.log("✔ Environment variables validated successfully.")
}
