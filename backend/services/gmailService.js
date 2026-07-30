import crypto from "crypto"
import jwt from "jsonwebtoken"
import User from "../models/User.js"
import Job from "../models/Job.js"
import aiOrchestrator from "./aiOrchestrator.js"

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.send"
]

const DEFAULT_JOB_MAIL_QUERY = 'newer_than:180d (application OR interview OR recruiter OR hiring OR "next steps" OR "thank you for applying")'

function getJwtSecret() {
  return process.env.JWT_SECRET || "defaultjwtsecretforlocaldevelopmentonly"
}

function getClientUrl() {
  return (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "")
}

function getRedirectUri() {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost:5000/api/gmail/oauth/callback"
}

function getGoogleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: getRedirectUri()
  }
}

function ensureGoogleConfig() {
  const config = getGoogleConfig()
  if (!config.clientId || !config.clientSecret) {
    throw new Error("Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI.")
  }
  return config
}

function getEncryptionKey() {
  const source = process.env.GMAIL_TOKEN_ENCRYPTION_KEY || getJwtSecret()
  return crypto.createHash("sha256").update(source).digest()
}

function encryptToken(value) {
  if (!value) return ""
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`
}

function decryptToken(value) {
  if (!value) return ""
  const [version, ivValue, tagValue, encryptedValue] = value.split(":")
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Stored Gmail token is not in a supported format.")
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivValue, "base64url"))
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final()
  ]).toString("utf8")
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  const text = await response.text()
  let data = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
  }

  if (!response.ok) {
    const message = data.error_description || data.error?.message || data.error || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return data
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function normalizeHeaderValue(value = "") {
  return String(value).replace(/\r?\n/g, " ").trim()
}

function buildRawEmail({ to, subject, content }) {
  const cleanedTo = normalizeHeaderValue(to)
  const cleanedSubject = normalizeHeaderValue(subject)
  const mime = [
    `To: ${cleanedTo}`,
    `Subject: ${cleanedSubject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "MIME-Version: 1.0",
    "",
    content || ""
  ].join("\r\n")

  return base64UrlEncode(mime)
}

function getHeader(payload, name) {
  const header = payload?.headers?.find(item => item.name.toLowerCase() === name.toLowerCase())
  return header?.value || ""
}

function extractEmailAddress(value = "") {
  const match = value.match(/<([^>]+)>/)
  return (match ? match[1] : value).trim()
}

function parseMessage(message) {
  const from = getHeader(message.payload, "From")
  const subject = getHeader(message.payload, "Subject")
  const date = getHeader(message.payload, "Date")

  return {
    id: message.id,
    threadId: message.threadId,
    from,
    fromEmail: extractEmailAddress(from),
    subject,
    date,
    snippet: message.snippet || ""
  }
}

function getProfilePayload(user) {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
    headline: user.headline,
    bio: user.bio,
    profileLinks: user.profileLinks,
    codingProfiles: user.codingProfiles,
    skills: user.skills,
    education: user.education,
    experience: user.experience,
    projects: user.projects,
    certifications: user.certifications,
    resumeText: user.resumeText
  }
}

function parseAiJson(rawResponse) {
  let cleaned = rawResponse.trim()
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "").trim()
  }
  return JSON.parse(cleaned.replace(/\\(?!["\\/bfnrtu])/g, "\\\\"))
}

class GmailService {
  getStatus(user) {
    const config = getGoogleConfig()
    return {
      configured: Boolean(config.clientId && config.clientSecret),
      connected: Boolean(user.gmailConnection?.connected),
      email: user.gmailConnection?.email || "",
      scope: user.gmailConnection?.scope || "",
      connectedAt: user.gmailConnection?.connectedAt || null,
      lastSyncedAt: user.gmailConnection?.lastSyncedAt || null
    }
  }

  buildConnectUrl(userId) {
    const config = ensureGoogleConfig()
    const state = jwt.sign(
      { id: String(userId), intent: "gmail-oauth" },
      getJwtSecret(),
      { expiresIn: "10m" }
    )

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: GMAIL_SCOPES.join(" "),
      state
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  async handleOAuthCallback({ code, state }) {
    if (!code || !state) {
      throw new Error("Missing Gmail OAuth code or state.")
    }

    const decoded = jwt.verify(state, getJwtSecret())
    if (decoded.intent !== "gmail-oauth" || !decoded.id) {
      throw new Error("Invalid Gmail OAuth state.")
    }

    const config = ensureGoogleConfig()
    const tokenData = await requestJson("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code"
      })
    })

    const profile = await requestJson("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })

    const user = await User.findById(decoded.id).select("+gmailConnection.accessToken +gmailConnection.refreshToken")
    if (!user) {
      throw new Error("User not found.")
    }

    const existingRefreshToken = user.gmailConnection?.refreshToken
    const refreshToken = tokenData.refresh_token || (existingRefreshToken ? decryptToken(existingRefreshToken) : "")
    if (!refreshToken) {
      throw new Error("Google did not return a refresh token. Disconnect this app in your Google account and connect again.")
    }

    user.gmailConnection = {
      connected: true,
      email: profile.emailAddress || "",
      googleUserId: profile.emailAddress || "",
      scope: tokenData.scope || GMAIL_SCOPES.join(" "),
      tokenType: tokenData.token_type || "Bearer",
      accessToken: encryptToken(tokenData.access_token),
      refreshToken: encryptToken(refreshToken),
      expiryDate: new Date(Date.now() + Number(tokenData.expires_in || 3600) * 1000),
      connectedAt: user.gmailConnection?.connectedAt || new Date(),
      lastSyncedAt: user.gmailConnection?.lastSyncedAt || null
    }
    await user.save()

    return this.getStatus(user)
  }

  async getAccessToken(userId) {
    const user = await User.findById(userId).select("+gmailConnection.accessToken +gmailConnection.refreshToken")
    if (!user || !user.gmailConnection?.connected || !user.gmailConnection?.refreshToken) {
      throw new Error("Gmail is not connected.")
    }

    const expiryDate = user.gmailConnection.expiryDate ? new Date(user.gmailConnection.expiryDate).getTime() : 0
    if (user.gmailConnection.accessToken && expiryDate > Date.now() + 60000) {
      return decryptToken(user.gmailConnection.accessToken)
    }

    const config = ensureGoogleConfig()
    const refreshToken = decryptToken(user.gmailConnection.refreshToken)
    const tokenData = await requestJson("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      })
    })

    user.gmailConnection.accessToken = encryptToken(tokenData.access_token)
    user.gmailConnection.expiryDate = new Date(Date.now() + Number(tokenData.expires_in || 3600) * 1000)
    if (tokenData.scope) user.gmailConnection.scope = tokenData.scope
    await user.save()

    return tokenData.access_token
  }

  async disconnect(userId) {
    const user = await User.findById(userId).select("+gmailConnection.accessToken +gmailConnection.refreshToken")
    if (!user) throw new Error("User not found.")

    const refreshToken = user.gmailConnection?.refreshToken ? decryptToken(user.gmailConnection.refreshToken) : ""
    if (refreshToken) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }).catch(() => null)
    }

    user.gmailConnection = {}
    await user.save()
    return this.getStatus(user)
  }

  async listJobMessages(userId, { query = DEFAULT_JOB_MAIL_QUERY, maxResults = 20 } = {}) {
    const accessToken = await this.getAccessToken(userId)
    const boundedMaxResults = Math.min(Math.max(Number(maxResults) || 20, 1), 50)
    const params = new URLSearchParams({
      q: query || DEFAULT_JOB_MAIL_QUERY,
      maxResults: String(boundedMaxResults)
    })

    const listData = await requestJson(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    const messages = await Promise.all((listData.messages || []).map(async message => {
      const detailParams = new URLSearchParams({ format: "metadata" })
      for (const header of ["From", "To", "Subject", "Date"]) {
        detailParams.append("metadataHeaders", header)
      }

      const detail = await requestJson(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?${detailParams.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      return parseMessage(detail)
    }))

    await User.findByIdAndUpdate(userId, { "gmailConnection.lastSyncedAt": new Date() })
    return { query: query || DEFAULT_JOB_MAIL_QUERY, messages }
  }

  async generateCompanyEmail({ userId, jobId, tone = "warm professional", to = "", subject = "", content = "" }) {
    if (!jobId) {
      throw new Error("jobId is required when generating a Gmail draft.")
    }

    const [user, job] = await Promise.all([
      User.findById(userId),
      Job.findOne({ _id: jobId, user: userId })
    ])

    if (!user) throw new Error("User not found.")
    if (!job) throw new Error("Job application not found.")

    if (content) {
      return {
        subject: subject || `Regarding ${job.role} at ${job.company}`,
        content
      }
    }

    const prompt = `
Draft a concise personalized job outreach email.

Recipient email:
${to || job.recruiterEmail || "Unknown"}

User profile:
${JSON.stringify(getProfilePayload(user))}

Target job:
Company: ${job.company}
Role: ${job.role}
Recruiter: ${job.recruiterName || ""}
Job URL: ${job.url || ""}
Job description:
${job.jobDescription || "No job description saved."}

Tone: ${tone}

Return only valid raw JSON:
{
  "subject": "short email subject",
  "content": "plain text email body"
}

Use only factual profile details. Do not invent employers, metrics, degrees, or projects.
`
    const rawResponse = await aiOrchestrator.execute("emails", [
      { role: "system", content: "You write accurate job outreach emails and return raw JSON only." },
      { role: "user", content: prompt }
    ])

    const parsed = parseAiJson(rawResponse)
    return {
      subject: subject || parsed.subject || `Regarding ${job.role} at ${job.company}`,
      content: content || parsed.content || ""
    }
  }

  async createDraft({ userId, jobId, to, subject, content, tone }) {
    if (!to) throw new Error("Recipient email is required.")
    const accessToken = await this.getAccessToken(userId)
    const generated = await this.generateCompanyEmail({ userId, jobId, tone, to, subject, content })
    if (!generated.subject || !generated.content) {
      throw new Error("Email subject and content are required.")
    }

    const draft = await requestJson("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: {
          raw: buildRawEmail({ to, subject: generated.subject, content: generated.content })
        }
      })
    })

    return { draftId: draft.id, messageId: draft.message?.id || "", ...generated }
  }

  async sendEmail({ userId, jobId, to, subject, content, tone }) {
    if (!to) throw new Error("Recipient email is required.")
    const accessToken = await this.getAccessToken(userId)
    const generated = await this.generateCompanyEmail({ userId, jobId, tone, to, subject, content })
    if (!generated.subject || !generated.content) {
      throw new Error("Email subject and content are required.")
    }

    const message = await requestJson("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        raw: buildRawEmail({ to, subject: generated.subject, content: generated.content })
      })
    })

    if (jobId) {
      await Job.findOneAndUpdate(
        { _id: jobId, user: userId },
        {
          $set: { recruiterEmail: to },
          $push: {
            timeline: {
              title: "Gmail outreach sent",
              date: new Date(),
              details: generated.subject
            }
          }
        }
      )
    }

    return { messageId: message.id, threadId: message.threadId, ...generated }
  }

  getRedirectUrl(status, message = "") {
    const params = new URLSearchParams({ gmail: status })
    if (message) params.set("message", message)
    return `${getClientUrl()}/mail?${params.toString()}`
  }
}

export default new GmailService()
