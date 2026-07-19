import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import connectDB from "./config/db.js"
import { validateEnv } from "./utils/envValidator.js"
import errorHandler from "./middleware/errorHandler.js"

import authRoutes from "./routes/auth.js"
import jobRoutes from "./routes/jobs.js"
import profileRoutes from "./routes/profile.js"
import resumeRoutes from "./routes/resume.js"
import aiRoutes from "./routes/ai.js"
import prepRoutes from "./routes/prep.js"
import automateRoutes from "./routes/automate.js"

// Load env variables
dotenv.config()

// Validate environments on boot
validateEnv()

// Ensure physical uploads folder exists
const uploadDirs = [
  path.join("uploads", "resumes"),
  path.join("uploads", "portfolios"),
  path.join("uploads", "tailored")
]
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

// Connect to database
connectDB()

const app = express()

// Middleware
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173"
const allowedOrigins = [clientUrl]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith("chrome-extension://") || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error("Not allowed by CORS"))
    }
  },
  credentials: true
}))
app.use(express.json())

// Serve uploads folder static files (optional, but good for accessibility later)
app.use("/uploads", express.static(path.join("uploads")))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/jobs", jobRoutes)
app.use("/api/profile", profileRoutes) // Changed endpoint path from "/api/profile-links" to "/api/profile"
app.use("/api/resume", resumeRoutes)
app.use("/api/ai", aiRoutes)
app.use("/api/prep", prepRoutes)
app.use("/api/automate", automateRoutes)

// Root Endpoint
app.get("/", (req, res) => {
  res.json({ message: "CareerOS API is running..." })
})

// Health check endpoint for Render
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() })
})


// Centralized Global Error Handler Middleware
app.use(errorHandler)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`)
  console.log(`CORS allowed origin: ${clientUrl}`)
})
