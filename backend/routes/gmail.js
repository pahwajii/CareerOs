import express from "express"
import auth from "../middleware/auth.js"
import {
  getGmailStatus,
  getGmailConnectUrl,
  handleGmailOAuthCallback,
  disconnectGmail,
  listGmailJobMessages,
  createGmailDraft,
  sendGmailEmail
} from "../controllers/gmailController.js"

const router = express.Router()

router.get("/oauth/callback", handleGmailOAuthCallback)
router.get("/status", auth, getGmailStatus)
router.get("/connect-url", auth, getGmailConnectUrl)
router.delete("/disconnect", auth, disconnectGmail)
router.get("/messages", auth, listGmailJobMessages)
router.post("/drafts", auth, createGmailDraft)
router.post("/send", auth, sendGmailEmail)

export default router
