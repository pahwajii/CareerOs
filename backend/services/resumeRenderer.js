import puppeteer from "puppeteer"
import HTMLtoDOCX from "html-to-docx"
import fs from "fs"

let browserInstance = null

// Reuse a single browser instance across requests instead of launching a new
// Chromium process per resume — launching is the expensive part.
async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"] // required in most container/Linux hosts
    })
  }
  return browserInstance
}

export async function renderHtmlToPdf(html, outputPath) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: "networkidle0" })
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true
    })
    return true
  } finally {
    await page.close()
  }
}

export async function renderHtmlToDocx(html, outputPath) {
  const fileBuffer = await HTMLtoDOCX(html, null, {
    table: { row: { cantSplit: true } },
    footer: false,
    pageNumber: false
  })
  fs.writeFileSync(outputPath, fileBuffer)
  return true
}
