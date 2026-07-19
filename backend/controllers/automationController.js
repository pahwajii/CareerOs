import automationService from "../services/automationService.js"

/**
 * Trigger Playwright headed browser form auto-filler
 * POST /api/automate/apply
 */
export async function runApply(req, res, next) {
  const { jobId } = req.body

  try {
    if (!jobId) {
      return res.status(400).json({ message: "jobId is required to start automation." })
    }

    console.log(`AI Automation: Triggering pre-fill pipeline for job ID: ${jobId}...`)
    
    // We execute the automation process. To prevent request timeouts, we can start it,
    // wait for form-filling to complete (which takes 5-10s), return response, 
    // and let the browser closure cleanup run asynchronously.
    let statusText = "Initializing..."
    const updateStatus = (stage, msg) => {
      statusText = msg
      console.log(`[Playwright Step - ${stage}]: ${msg}`)
    }

    // Run the main pre-fill pipeline. We block until it reaches the "paused" review state
    // so we can confirm form-filling succeeded before returning HTTP response.
    // In the background, Playwright will wait for the user to close the window and save the job.
    automationService.runAutoApply(req.userId, jobId, updateStatus)
      .then((result) => {
        console.log("Playwright automation finished in background:", result)
      })
      .catch((err) => {
        console.error("Playwright background run failed:", err)
      })

    // Return immediately to the frontend so it can display the review message
    res.json({
      success: true,
      message: "Playwright headed browser launched! Please review, edit, and click Submit manually in the opened Chrome window."
    })
  } catch (error) {
    next(error)
  }
}
