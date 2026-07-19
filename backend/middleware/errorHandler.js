/**
 * Global centralized error handling middleware.
 * Ensures all uncaught exceptions in async routes return clean JSON formats.
 */
export default function errorHandler(err, req, res, next) {
  console.error("❌ Uncaught Server Exception:", err.stack || err.message)

  const status = err.status || 500
  const message = err.message || "An unexpected server error occurred."

  res.status(status).json({
    message,
    // Only output stack trace in development mode
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  })
}
