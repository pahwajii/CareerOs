import User from "../models/User.js"
import gmailService from "../services/gmailService.js"

export async function getGmailStatus(req, res, next) {
  try {
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ message: "User not found." })
    res.json(gmailService.getStatus(user))
  } catch (error) {
    next(error)
  }
}

export async function getGmailConnectUrl(req, res, next) {
  try {
    res.json({ url: gmailService.buildConnectUrl(req.userId) })
  } catch (error) {
    next(error)
  }
}

export async function handleGmailOAuthCallback(req, res) {
  try {
    await gmailService.handleOAuthCallback(req.query)
    res.redirect(gmailService.getRedirectUrl("connected"))
  } catch (error) {
    console.error("Gmail OAuth callback failed:", error)
    res.redirect(gmailService.getRedirectUrl("error", error.message || "Gmail connection failed."))
  }
}

export async function disconnectGmail(req, res, next) {
  try {
    res.json(await gmailService.disconnect(req.userId))
  } catch (error) {
    next(error)
  }
}

export async function listGmailJobMessages(req, res, next) {
  try {
    const { query, maxResults } = req.query
    res.json(await gmailService.listJobMessages(req.userId, { query, maxResults }))
  } catch (error) {
    next(error)
  }
}

export async function createGmailDraft(req, res, next) {
  try {
    const { jobId, to, subject, content, tone } = req.body
    res.json(await gmailService.createDraft({ userId: req.userId, jobId, to, subject, content, tone }))
  } catch (error) {
    next(error)
  }
}

export async function sendGmailEmail(req, res, next) {
  try {
    const { jobId, to, subject, content, tone, confirm } = req.body
    if (confirm !== true) {
      return res.status(400).json({ message: "Confirm must be true before sending email." })
    }

    res.json(await gmailService.sendEmail({ userId: req.userId, jobId, to, subject, content, tone }))
  } catch (error) {
    next(error)
  }
}
