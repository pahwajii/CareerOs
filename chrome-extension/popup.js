// popup.js - Handles backend calls, token sync, scrapers command actions, and widget layouts.

const BACKEND_URL = "http://localhost:5000/api"
const FRONTEND_URL = "http://localhost:5173"

let authToken = ""
let activeJobId = ""
let scrapedJobData = null

document.addEventListener("DOMContentLoaded", async () => {
  // Select DOM targets
  const authStatus = document.getElementById("authStatus")
  const alertBanner = document.getElementById("alertBanner")
  const jobDetailsContainer = document.getElementById("jobDetailsContainer")
  const scrapedTitle = document.getElementById("scrapedTitle")
  const scrapedCompany = document.getElementById("scrapedCompany")
  const btnAnalyze = document.getElementById("btnAnalyze")
  const resultsCard = document.getElementById("resultsCard")
  const matchScoreVal = document.getElementById("matchScoreVal")
  
  const btnTailorResume = document.getElementById("btnTailorResume")
  const btnCoverLetter = document.getElementById("btnCoverLetter")
  const btnDashboard = document.getElementById("btnDashboard")

  const analyzeSpinner = document.getElementById("analyzeSpinner")
  const tailorSpinner = document.getElementById("tailorSpinner")
  const letterSpinner = document.getElementById("letterSpinner")

  // 1. Authenticate (Pull token from local CareerOS app tabs)
  showAlert("Connecting to CareerOS token...", "info")
  chrome.tabs.query({ url: `${FRONTEND_URL}/*` }, (tabs) => {
    if (tabs.length > 0) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: () => localStorage.getItem("token")
        },
        (results) => {
          if (results && results[0] && results[0].result) {
            authToken = results[0].result
            chrome.storage.local.set({ token: authToken })
            setConnectedState(true)
            triggerScrape()
          } else {
            tryRestoreCachedToken()
          }
        }
      )
    } else {
      tryRestoreCachedToken()
    }
  })

  function tryRestoreCachedToken() {
    chrome.storage.local.get(["token"], (result) => {
      if (result && result.token) {
        authToken = result.token
        setConnectedState(true)
        triggerScrape()
      } else {
        setConnectedState(false)
        showAlert("Please log in to your CareerOS app at localhost:5173 first.", "error")
      }
    })
  }

  function setConnectedState(isConnected) {
    if (isConnected) {
      authStatus.innerText = "CONNECTED"
      authStatus.classList.add("connected")
      btnAnalyze.disabled = false
      hideAlert()
    } else {
      authStatus.innerText = "DISCONNECTED"
      authStatus.classList.remove("connected")
      btnAnalyze.disabled = true
    }
  }

  // 2. Trigger scraper script on the active tab page
  function triggerScrape() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return
      
      chrome.tabs.sendMessage(tabs[0].id, { action: "scrapeJob" }, (response) => {
        if (response && response.success && response.data) {
          scrapedJobData = response.data
          scrapedTitle.innerText = scrapedJobData.role
          scrapedCompany.innerText = scrapedJobData.company
          jobDetailsContainer.style.display = "block"
        } else {
          showAlert("Could not extract listing. Make sure you are on a jobs page.", "error")
        }
      })
    })
  }

  // 3. Analyze listing click trigger
  btnAnalyze.addEventListener("click", async () => {
    if (!scrapedJobData || !authToken) return
    
    btnAnalyze.disabled = true
    analyzeSpinner.style.display = "inline-block"
    showAlert("Cataloging job to CareerOS Tracker...", "info")

    try {
      // Step A: Catalog the job in the database (status: saved)
      const saveRes = await fetch(`${BACKEND_URL}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          company: scrapedJobData.company,
          role: scrapedJobData.role,
          url: scrapedJobData.url,
          jobDescription: scrapedJobData.jobDescription,
          status: "saved"
        })
      })

      if (!saveRes.ok) throw new Error("Failed to catalog application.")
      const job = await saveRes.json()
      activeJobId = job._id

      showAlert("Running DeepSeek R1 Match analysis...", "info")

      // Step B: Run DeepSeek R1 matching
      const matchRes = await fetch(`${BACKEND_URL}/ai/match-analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ jobId: activeJobId })
      })

      if (!matchRes.ok) throw new Error("Failed to run match analyzer.")
      const matchAnalysis = await matchRes.json()

      // Step C: Update Job Score
      const score = matchAnalysis.overallMatch || 70
      await fetch(`${BACKEND_URL}/jobs/${activeJobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ matchScore: score })
      })

      // Show results
      matchScoreVal.innerText = `${score}%`
      resultsCard.style.display = "flex"
      hideAlert()
    } catch (err) {
      showAlert(err.message || "Failed to analyze page.", "error")
    } finally {
      btnAnalyze.disabled = false
      analyzeSpinner.style.display = "none"
    }
  })

  // 4. Document generation commands
  btnTailorResume.addEventListener("click", async () => {
    if (!activeJobId) return
    btnTailorResume.disabled = true
    tailorSpinner.style.display = "inline-block"
    showAlert("Claude is tailoring your resume PDF...", "info")

    try {
      const res = await fetch(`${BACKEND_URL}/resume/tailor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ jobId: activeJobId })
      })
      if (!res.ok) throw new Error("Tailoring request failed.")
      showAlert("Resume tailored successfully! Check your dashboard.", "info")
    } catch (err) {
      showAlert("Failed to tailor resume.", "error")
    } finally {
      btnTailorResume.disabled = false
      tailorSpinner.style.display = "none"
    }
  })

  btnCoverLetter.addEventListener("click", async () => {
    if (!activeJobId) return
    btnCoverLetter.disabled = true
    letterSpinner.style.display = "inline-block"
    showAlert("GPT is writing custom cover letter...", "info")

    try {
      const res = await fetch(`${BACKEND_URL}/ai/outreach/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          jobId: activeJobId,
          type: "cover-letter",
          tone: "professional"
        })
      })
      if (!res.ok) throw new Error("Letter draft request failed.")
      showAlert("Cover letter generated successfully!", "info")
    } catch (err) {
      showAlert("Failed to generate cover letter.", "error")
    } finally {
      btnCoverLetter.disabled = false
      letterSpinner.style.display = "none"
    }
  })

  // 5. Open dashboard link
  btnDashboard.addEventListener("click", () => {
    chrome.tabs.create({ url: FRONTEND_URL })
  })

  // UI utilities
  function showAlert(text, type = "info") {
    alertBanner.innerText = text
    alertBanner.style.display = "block"
    alertBanner.className = `alert-banner ${type}`
  }

  function hideAlert() {
    alertBanner.style.display = "none"
  }
})
