import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import authRoutes from "./routes/auth.js"
import jobRoutes from "./routes/jobs.js"
import profileRoutes from "./routes/profile.js"
import resumeRoutes from "./routes/resume.js"
import aiRoutes from "./routes/ai.js"
import Job from "./models/Job.js"
import User from "./models/User.js"
import dotenv from "dotenv"
import errorHandler from "./middleware/errorHandler.js"

dotenv.config()

// Test config
const PORT = 5001
let MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/jobtracker-test"
if (MONGO_URI.includes("/jobtracker?")) {
  MONGO_URI = MONGO_URI.replace("/jobtracker?", "/jobtracker_test?")
} else if (MONGO_URI.includes(".net/?")) {
  MONGO_URI = MONGO_URI.replace(".net/?", ".net/jobtracker_test?")
}
process.env.JWT_SECRET = "testsecretkeyforjwtauthenticationverification"
process.env.PORT = PORT
process.env.MONGO_URI = MONGO_URI

const app = express()
app.use(cors())
app.use(express.json())

app.use("/api/auth", authRoutes)
app.use("/api/jobs", jobRoutes)
app.use("/api/profile-links", profileRoutes)
app.use("/api/resume", resumeRoutes)
app.use("/api/ai", aiRoutes)
app.use(errorHandler)

let server

async function runTests() {
  console.log("=== STARTING BACKEND AUTOMATED API TESTS ===")
  
  // Connect to DB
  try {
    await mongoose.connect(MONGO_URI)
    console.log("Connected to test database:", MONGO_URI)
  } catch (err) {
    console.error("DB Connection failed:", err)
    process.exit(1)
  }

  // Clear previous test data
  await User.deleteMany({})
  await Job.deleteMany({})
  console.log("Cleared old test users and jobs.")

  // Start Server
  server = app.listen(PORT, async () => {
    console.log(`Test server running on port ${PORT}`)
    
    try {
      const baseUrl = `http://localhost:${PORT}/api`
      
      // 1. Signup User A
      console.log("\n1. Testing Signup for User A...")
      const signupResA = await fetch(`${baseUrl}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "User A",
          email: "usera@example.com",
          password: "password123"
        })
      })
      const userA = await signupResA.json()
      if (signupResA.status !== 201 || !userA.token) {
        throw new Error(`Signup User A failed: ${JSON.stringify(userA)}`)
      }
      console.log("✔ User A signed up successfully. Token acquired.")

      // 2. Signup User B
      console.log("\n2. Testing Signup for User B...")
      const signupResB = await fetch(`${baseUrl}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "User B",
          email: "userb@example.com",
          password: "password456"
        })
      })
      const userB = await signupResB.json()
      if (signupResB.status !== 201 || !userB.token) {
        throw new Error(`Signup User B failed: ${JSON.stringify(userB)}`)
      }
      console.log("✔ User B signed up successfully. Token acquired.")

      // 3. Login User A
      console.log("\n3. Testing Login for User A...")
      const loginResA = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "usera@example.com",
          password: "password123"
        })
      })
      const loginA = await loginResA.json()
      if (loginResA.status !== 200 || !loginA.token) {
        throw new Error(`Login User A failed: ${JSON.stringify(loginA)}`)
      }
      console.log("✔ User A logged in successfully.")

      // 4. Job CRUD: Create Job for User A
      console.log("\n4. Testing Job Creation (POST /api/jobs) for User A...")
      const createJobResA = await fetch(`${baseUrl}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${loginA.token}`
        },
        body: JSON.stringify({
          company: "Google",
          role: "Software Engineer",
          status: "applied",
          salary: "150000",
          location: "Mountain View, CA",
          notes: "First application",
          checklist: [{ text: "Tailor Resume", done: false }]
        })
      })
      const jobA = await createJobResA.json()
      if (createJobResA.status !== 201 || !jobA._id) {
        throw new Error(`Create job for User A failed: ${JSON.stringify(jobA)}`)
      }
      console.log(`✔ Job created for User A: ${jobA.role} at ${jobA.company} (ID: ${jobA._id})`)

      // 5. Job CRUD: Create Job for User B
      console.log("\n5. Testing Job Creation (POST /api/jobs) for User B...")
      const createJobResB = await fetch(`${baseUrl}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userB.token}`
        },
        body: JSON.stringify({
          company: "Meta",
          role: "Product Designer",
          status: "interview",
          salary: "140000",
          location: "Menlo Park, CA"
        })
      })
      const jobB = await createJobResB.json()
      if (createJobResB.status !== 201 || !jobB._id) {
        throw new Error(`Create job for User B failed: ${JSON.stringify(jobB)}`)
      }
      console.log(`✔ Job created for User B: ${jobB.role} at ${jobB.company} (ID: ${jobB._id})`)

      // 6. Read Jobs: Verify User A only sees A's jobs, B only sees B's jobs
      console.log("\n6. Testing Job Access Isolation (GET /api/jobs)...")
      const getJobsResA = await fetch(`${baseUrl}/jobs`, {
        headers: { "Authorization": `Bearer ${loginA.token}` }
      })
      const jobsA = await getJobsResA.json()
      if (jobsA.length !== 1 || jobsA[0]._id !== jobA._id) {
        throw new Error(`User A retrieved incorrect jobs list: ${JSON.stringify(jobsA)}`)
      }
      console.log("✔ User A can only see User A's jobs.")

      const getJobsResB = await fetch(`${baseUrl}/jobs`, {
        headers: { "Authorization": `Bearer ${userB.token}` }
      })
      const jobsB = await getJobsResB.json()
      if (jobsB.length !== 1 || jobsB[0]._id !== jobB._id) {
        throw new Error(`User B retrieved incorrect jobs list: ${JSON.stringify(jobsB)}`)
      }
      console.log("✔ User B can only see User B's jobs.")

      // 7. Security Isolation: Try to access User A's job with User B's token
      console.log("\n7. Testing Security Isolation (User B trying to modify User A's job)...")
      const accessAttemptRes = await fetch(`${baseUrl}/jobs/${jobA._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userB.token}`
        },
        body: JSON.stringify({ status: "offer" })
      })
      
      console.log(`Status returned for cross-user edit attempt: ${accessAttemptRes.status}`)
      if (accessAttemptRes.status !== 404) {
        throw new Error(`Security breach! User B was able to modify/access User A's job (Status: ${accessAttemptRes.status})`)
      }
      console.log("✔ Security isolation verified: User B received 404 when attempting to mutate User A's job.")

      // 8. Test Checklist Update
      console.log("\n8. Testing Checklist Update (PUT /api/jobs/:id/checklist)...")
      const newChecklist = [
        { text: "Tailor Resume", done: true },
        { text: "Prepare for screening", done: false }
      ]
      const checklistUpdateRes = await fetch(`${baseUrl}/jobs/${jobA._id}/checklist`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${loginA.token}`
        },
        body: JSON.stringify({ checklist: newChecklist })
      })
      const updatedChecklist = await checklistUpdateRes.json()
      if (checklistUpdateRes.status !== 200 || updatedChecklist.length !== 2 || !updatedChecklist[0].done) {
        throw new Error(`Checklist update failed: ${JSON.stringify(updatedChecklist)}`)
      }
      console.log("✔ Checklist items updated and toggled successfully.")

      // 9. Test Analytics Aggregation
      console.log("\n9. Testing Analytics Aggregation (GET /api/jobs/analytics)...")
      const analyticsRes = await fetch(`${baseUrl}/jobs/analytics`, {
        headers: { "Authorization": `Bearer ${loginA.token}` }
      })
      const analytics = await analyticsRes.json()
      if (analyticsRes.status !== 200 || !analytics.statusCounts || analytics.metrics.totalJobs !== 1) {
        throw new Error(`Analytics aggregation failed: ${JSON.stringify(analytics)}`)
      }
      console.log("✔ Analytics aggregates calculated successfully.")
      console.log(`  - Status counts: ${JSON.stringify(analytics.statusCounts)}`)
      console.log(`  - Metrics: ${JSON.stringify(analytics.metrics)}`)
      console.log(`  - Timeline data count: ${analytics.timelineData.length}`)

      // 10. Test AI route error handling (when API key is empty)
      console.log("\n10. Testing AI Endpoint Graceful Degradation (no API key configured)...")
      const originalKey = process.env.FORGE_API_KEY
      const originalGeminiKey = process.env.GEMINI_API_KEY
      delete process.env.FORGE_API_KEY
      delete process.env.GEMINI_API_KEY

      const aiPrepRes = await fetch(`${baseUrl}/ai/prep`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${loginA.token}`
        },
        body: JSON.stringify({ jobId: jobA._id })
      })
      const aiPrepData = await aiPrepRes.json()
      
      // Restore API keys
      if (originalKey) {
        process.env.FORGE_API_KEY = originalKey
      }
      if (originalGeminiKey) {
        process.env.GEMINI_API_KEY = originalGeminiKey
      }

      console.log(`AI Endpoint response status: ${aiPrepRes.status}`)
      console.log(`AI Endpoint error response: ${JSON.stringify(aiPrepData)}`)
      if (aiPrepRes.status !== 500 || (!aiPrepData.message.includes("API key is not configured") && !aiPrepData.message.includes("FORGE_API_KEY is not defined"))) {
        throw new Error(`AI route did not degrade gracefully: ${JSON.stringify(aiPrepData)}`)
      }
      console.log("✔ AI endpoint degraded gracefully, returning an informative 500 error.")

      // 11. Delete Job
      console.log("\n11. Testing Job Deletion (DELETE /api/jobs/:id)...")
      const deleteJobRes = await fetch(`${baseUrl}/jobs/${jobA._id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${loginA.token}` }
      })
      const deleteResult = await deleteJobRes.json()
      if (deleteJobRes.status !== 200) {
        throw new Error(`Delete job failed: ${JSON.stringify(deleteResult)}`)
      }
      console.log("✔ Job deleted successfully.")

      console.log("\n=== ALL BACKEND AUTOMATED API TESTS PASSED! ===")
      cleanupAndExit(0)
    } catch (testError) {
      console.error("\n❌ TEST FAILED:", testError)
      cleanupAndExit(1)
    }
  })
}

function cleanupAndExit(code) {
  if (server) {
    server.close(() => {
      console.log("Server stopped.")
      mongoose.disconnect().then(() => {
        console.log("Disconnected from database. Exiting with code", code)
        process.exit(code)
      })
    })
  } else {
    process.exit(code)
  }
}

runTests()
