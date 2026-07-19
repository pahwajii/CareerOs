export function buildResumeHtml(content, user) {
  const contactParts = []
  if (user.email) contactParts.push(`<a href="mailto:${user.email}">${user.email}</a>`)
  if (user.phone) contactParts.push(escapeHtml(user.phone))
  
  // Support both codingProfiles and profileLinks
  const github = user.codingProfiles?.github || user.profileLinks?.github || ""
  const linkedin = user.codingProfiles?.linkedin || user.profileLinks?.linkedin || ""
  
  if (github) {
    const gh = github.replace(/^https?:\/\/(www\.)?/, "")
    contactParts.push(`<a href="${github}">${gh}</a>`)
  }
  if (linkedin) {
    const li = linkedin.replace(/^https?:\/\/(www\.)?/, "")
    contactParts.push(`<a href="${linkedin}">${li}</a>`)
  }

  const skillsRows = content.skills.map(s =>
    `<tr><td class="skill-cat">${escapeHtml(s.category)}</td><td>${escapeHtml(s.items)}</td></tr>`
  ).join("")

  const educationBlocks = (user.education || []).map(edu => {
    const title = edu.fieldOfStudy ? `${edu.degree} in ${edu.fieldOfStudy}` : edu.degree
    const dateRange = (edu.startDate && edu.endDate) ? `${edu.startDate} -- ${edu.endDate}` : (edu.endDate || edu.startDate || "")
    const gradeInfo = edu.grade ? ` &nbsp;|&nbsp; Grade/CGPA: ${edu.grade}` : ""
    return `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title">${escapeHtml(title)}</span>
        <span class="entry-date">${escapeHtml(dateRange)}</span>
      </div>
      <div>${escapeHtml(edu.school)}${gradeInfo}</div>
    </div>
    `
  }).join("")

  const experienceBlocks = content.experience.map(e => `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title">${escapeHtml(e.title)}</span>
        <span class="entry-date">${escapeHtml(e.dateRange)}</span>
      </div>
      <ul>${e.bullets.map(b => `<li>${richText(b)}</li>`).join("")}</ul>
    </div>
  `).join("")

  const projectBlocks = content.projects.map(p => `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title">${escapeHtml(p.title)}</span>
        <span class="entry-date">${escapeHtml(p.dateRange)}</span>
      </div>
      <div class="tech-stack">${escapeHtml(p.techStack)}</div>
      <ul>${p.bullets.map(b => `<li>${richText(b)}</li>`).join("")}</ul>
    </div>
  `).join("")

  const achievementItems = content.achievements.map(a => `<li>${richText(a)}</li>`).join("")

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>${RESUME_CSS}</style>
</head>
<body>
  <div class="header">
    <div class="name">${escapeHtml((user.name || "").toUpperCase())}</div>
    <div class="headline">${escapeHtml(content.headline)}</div>
    <div class="contacts">${contactParts.join(" &nbsp;|&nbsp; ")}</div>
  </div>

  <div class="section">
    <h2>Education</h2>
    ${educationBlocks}
  </div>

  <div class="section">
    <h2>Technical Skills</h2>
    <table class="skills-table">${skillsRows}</table>
  </div>

  <div class="section">
    <h2>Work Experience</h2>
    ${experienceBlocks}
  </div>

  <div class="section">
    <h2>Projects</h2>
    ${projectBlocks}
  </div>

  <div class="section">
    <h2>Achievements &amp; Certifications</h2>
    <ul>${achievementItems}</ul>
  </div>
</body>
</html>`
}

// Escapes plain text for safe HTML injection
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Same as escapeHtml but preserves **bold** markdown from the AI, converting it to <strong>
function richText(str = "") {
  const escaped = escapeHtml(str)
  return escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
}

const RESUME_CSS = `
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica', Arial, sans-serif; font-size: 8.5pt; color: #1e293b; line-height: 1.35; }
  .header { text-align: center; margin-bottom: 6pt; }
  .name { font-size: 15pt; font-weight: 700; color: #000; letter-spacing: 0.5pt; }
  .headline { font-size: 8.5pt; margin-top: 2pt; }
  .contacts { font-size: 8pt; margin-top: 2pt; }
  .contacts a { color: #1d4ed8; text-decoration: none; }
  .section { margin-top: 7pt; }
  h2 { font-size: 9.5pt; text-transform: uppercase; border-bottom: 0.75pt solid #cbd5e1; padding-bottom: 2pt; margin: 0 0 4pt 0; }
  .entry { margin-bottom: 5pt; }
  .entry-header { display: flex; justify-content: space-between; font-weight: 700; }
  .entry-date { font-weight: 400; white-space: nowrap; }
  .tech-stack { font-size: 8pt; font-style: italic; color: #475569; margin: 1pt 0 2pt 0; }
  .skills-table { width: 100%; border-collapse: collapse; }
  .skills-table td { padding: 1pt 0; vertical-align: top; }
  .skill-cat { font-weight: 700; width: 22%; white-space: nowrap; padding-right: 8pt; }
  ul { margin: 2pt 0 0 0; padding-left: 12pt; }
  li { margin-bottom: 1.5pt; }
`
