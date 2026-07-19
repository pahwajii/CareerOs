// content.js - Scrapes page data for LinkedIn, Greenhouse, Lever, Ashby, and company career pages.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapeJob") {
    try {
      const data = scrapeJobPage()
      sendResponse({ success: true, data })
    } catch (err) {
      sendResponse({ success: false, error: err.message })
    }
  }
  return true
})

function scrapeJobPage() {
  const url = window.location.href
  const hostname = window.location.hostname.toLowerCase()
  
  let role = ""
  let company = ""
  let jobDescription = ""

  if (hostname.includes("linkedin.com")) {
    // LinkedIn Jobs matching rules
    const titleNode = document.querySelector(".job-details-jobs-unified-top-card__job-title, .jobs-details__main-content h1, .jobs-details-top-card__job-title")
    role = titleNode ? titleNode.innerText.trim() : ""

    const companyNode = document.querySelector(".job-details-jobs-unified-top-card__company-name, .jobs-details-top-card__company-name, .jobs-details__main-content a[href*='/company/']")
    company = companyNode ? companyNode.innerText.trim() : ""

    const descNode = document.querySelector("#job-details, .jobs-description__content, .jobs-description")
    jobDescription = descNode ? descNode.innerText.trim() : ""

  } else if (hostname.includes("greenhouse.io")) {
    // Greenhouse matching rules
    const titleNode = document.querySelector(".app-title, h1.heading")
    role = titleNode ? titleNode.innerText.trim() : ""

    const companyNode = document.querySelector(".company-name, .logo img")
    company = companyNode ? (companyNode.alt || companyNode.innerText).trim() : ""
    if (!company) {
      // fallback parsing document title e.g. "Software Engineer at Google"
      const match = document.title.match(/at\s+([^-]+)/i)
      if (match) company = match[1].trim()
    }

    const descNode = document.querySelector("#content, .job-description, #main")
    jobDescription = descNode ? descNode.innerText.trim() : ""

  } else if (hostname.includes("lever.co")) {
    // Lever matching rules
    const titleNode = document.querySelector(".posting-header h2")
    role = titleNode ? titleNode.innerText.trim() : ""

    // Lever usually lists company as a page title or sibling logo
    const companyNode = document.querySelector(".logo img")
    company = companyNode ? companyNode.alt.replace(" logo", "").trim() : ""
    if (!company) {
      const match = document.title.match(/(?:at|for)\s+([^-]+)/i)
      if (match) company = match[1].trim()
    }

    const descNode = document.querySelector(".section.page-centered, .job-description, .posting-content")
    jobDescription = descNode ? descNode.innerText.trim() : ""

  } else if (hostname.includes("ashbyhq.com")) {
    // Ashby matching rules
    const titleNode = document.querySelector("h1")
    role = titleNode ? titleNode.innerText.trim() : ""

    const companyNode = document.querySelector("h2")
    company = companyNode ? companyNode.innerText.trim() : ""
    if (!company) {
      const match = document.title.match(/(?:at|for)\s+([^-]+)/i)
      if (match) company = match[1].trim()
    }

    const descNode = document.querySelector("[class*='JobDescription'], .job-description, body")
    jobDescription = descNode ? descNode.innerText.trim() : ""

  } else {
    // Generic Career Pages Heuristic
    // Fallback: search main headings
    const h1s = Array.from(document.querySelectorAll("h1"))
    const titleNode = h1s.find(h => h.innerText.length > 5 && h.innerText.length < 60)
    role = titleNode ? titleNode.innerText.trim() : document.title.split("|")[0].split("-")[0].trim()

    // Hostname evaluation
    company = hostname.replace("www.", "").split(".")[0]
    company = company.charAt(0).toUpperCase() + company.slice(1)

    // Scrape description by joining main content divs
    const descNodes = Array.from(document.querySelectorAll("article, main, .job-description, .description, #job-description"))
    if (descNodes.length > 0) {
      jobDescription = descNodes.map(d => d.innerText).join("\n\n").trim()
    } else {
      jobDescription = document.body.innerText.trim()
    }
  }

  // Clean values
  role = role || "Software Engineer"
  company = company || "Tech Company"
  jobDescription = jobDescription || "No description extracted."

  return {
    role,
    company,
    jobDescription,
    url
  }
}
