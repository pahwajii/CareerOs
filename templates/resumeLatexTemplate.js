export function buildResumeLatex(content, user) {
  const esc = (s = "") => String(s).replace(/([&%$#_{}])/g, "\\$1")
  const richBold = (s = "") => {
    const escaped = esc(s)
    return escaped.replace(/\*\*(.*?)\*\*/g, "\\textbf{$1}")
  }

  const contacts = []
  if (user.email) contacts.push(`\\href{mailto:${user.email}}{${esc(user.email)}}`)
  if (user.phone) contacts.push(esc(user.phone))
  
  // Support both codingProfiles and profileLinks
  const github = user.codingProfiles?.github || user.profileLinks?.github || ""
  const linkedin = user.codingProfiles?.linkedin || user.profileLinks?.linkedin || ""
  
  if (github) {
    const gh = github.replace(/^https?:\/\/(www\.)?/, "")
    contacts.push(`\\href{${github}}{${esc(gh)}}`)
  }
  if (linkedin) {
    const li = linkedin.replace(/^https?:\/\/(www\.)?/, "")
    contacts.push(`\\href{${linkedin}}{${esc(li)}}`)
  }

  const skillsRows = content.skills
    .map(s => `${esc(s.category)} & ${esc(s.items)} \\\\`)
    .join("\n")

  const educationBlocks = (user.education || []).map(edu => {
    const title = edu.fieldOfStudy ? `${edu.degree} in ${edu.fieldOfStudy}` : edu.degree
    const dateRange = (edu.startDate && edu.endDate) ? `${edu.startDate} -- ${edu.endDate}` : (edu.endDate || edu.startDate || "")
    const gradeInfo = edu.grade ? ` \\hfill CGPA/Grade: ${esc(edu.grade)}` : ""
    return `\\textbf{${esc(title)}} \\hfill {${esc(dateRange)}} \\\\
${esc(edu.school)}${gradeInfo}`
  }).join("\n\\vspace{2pt}\n")

  const experienceBlocks = content.experience.map(e => `
\\textbf{${esc(e.title)}} \\hfill ${esc(e.dateRange)} \\\\[-10pt]
\\begin{itemize}
${e.bullets.map(b => `  \\item ${richBold(b)}`).join("\n")}
\\end{itemize}
`).join("\n\\vspace{2pt}\n")

  const projectBlocks = content.projects.map(p => `
\\textbf{${esc(p.title)}} \\hfill ${esc(p.dateRange)} \\\\[-3pt]
{\\small\\textit{${esc(p.techStack)}}} \\\\[-10pt]
\\begin{itemize}
${p.bullets.map(b => `  \\item ${richBold(b)}`).join("\n")}
\\end{itemize}
`).join("\n\\vspace{2pt}\n")

  const achievementItems = content.achievements
    .map(a => `  \\item ${richBold(a)}`)
    .join("\n")

  return `\\documentclass[10pt,letterpaper]{article}

\\usepackage[left=0.42in,top=0.25in,right=0.42in,bottom=0.25in]{geometry}
\\usepackage{hyperref}
\\hypersetup{colorlinks=true, urlcolor=blue, linkcolor=blue}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{array}
\\usepackage{xcolor}
\\usepackage{parskip}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}

\\titleformat{\\section}{\\normalfont\\bfseries\\uppercase}{}{0em}{}[\\titrule]
\\titlespacing{\\section}{0pt}{3pt}{2pt}

\\setlist[itemize]{noitemsep, topsep=0pt, parsep=0pt, partopsep=0pt, leftmargin=1.1em}

\\pagestyle{empty}

\\begin{document}

{\\centering
  {\\large \\textbf{${esc((user.name || "").toUpperCase())}}} \\\\[1pt]
  \\small
  ${esc(content.headline)} \\\\[1pt]
  ${contacts.join(" $\\;|\\;$ ")}
\\par}

\\vspace{2pt}

\\section{Education}
\\vspace{1pt}
${educationBlocks}

\\section{Technical Skills}
\\vspace{2pt}
\\begin{tabular}{@{} >{\\bfseries}l @{\\hspace{2ex}} l}
${skillsRows}
\\end{tabular}

\\section{Work Experience}
\\vspace{2pt}
${experienceBlocks}

\\section{Projects}
\\vspace{2pt}
${projectBlocks}

\\section{Achievements \\& Certifications}
\\begin{itemize}
${achievementItems}
\\end{itemize}

\\end{document}
`
}
