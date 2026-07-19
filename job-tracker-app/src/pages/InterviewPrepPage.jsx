import { useState, useEffect } from "react"
import { api } from "../services/api"
import useAsync from "../hooks/useAsync"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import LoadingSpinner from "../components/ui/LoadingSpinner"

const PREP_SECTIONS = [
  { id: "research", title: "Company Research", icon: "🏢" },
  { id: "behavioral", title: "Behavioral Questions", icon: "⭐" },
  { id: "resume", title: "Resume Questions", icon: "📄" },
  { id: "coding", title: "Coding Questions", icon: "💻" },
  { id: "design", title: "System Design", icon: "🏗" },
  { id: "salary", title: "Salary Negotiation", icon: "💰" },
  { id: "revision", title: "30 Minute Revision Guide", icon: "⏱" }
]

// Helper mapping to bridge Mongoose stored section titles with PREP_SECTIONS array
const TITLE_MAP = {
  "Company Research": "Company Research",
  "Behavioral Questions": "Behavioral Questions",
  "Resume Questions": "Resume Questions",
  "Coding Questions": "Coding Questions",
  "System Design": "System Design",
  "Salary Negotiation": "Salary Negotiation",
  "30 Minute Revision Guide": "30 Minute Revision Guide"
}

export default function InterviewPrepPage() {
  const [jobs, setJobs] = useState([])
  const [selectedJobId, setSelectedJobId] = useState("")
  const [prepSession, setPrepSession] = useState(null)
  
  // Track active section and its corresponding textarea edits
  const [activeSectionId, setActiveSectionId] = useState("research")
  const [editContent, setEditContent] = useState("")
  
  const [message, setMessage] = useState({ text: "", type: "" })
  const [hasProfile, setHasProfile] = useState(false)

  // Async handlers
  const generatePrepAsync = useAsync(api.generatePrep)
  const savePrepAsync = useAsync(api.updatePrep)

  // Load jobs and profiles on mount
  useEffect(() => {
    const loadInit = async () => {
      try {
        const jobsList = await api.getJobs()
        setJobs(jobsList || [])
        if (jobsList && jobsList.length > 0) {
          setSelectedJobId(jobsList[0]._id)
        }

        const profileData = await api.getProfile()
        if (profileData && (profileData.skills?.length > 0 || profileData.experience?.length > 0 || profileData.projects?.length > 0)) {
          setHasProfile(true)
        }
      } catch (err) {
        console.error("Init fetch failed:", err)
      }
    }
    loadInit()
  }, [])

  // Load existing prep session when selected job updates
  useEffect(() => {
    if (selectedJobId) {
      const fetchPrepSession = async () => {
        setPrepSession(null)
        setEditContent("")
        setMessage({ text: "", type: "" })
        try {
          const session = await api.getPrep(selectedJobId)
          if (session) {
            setPrepSession(session)
            // Load content for active section
            const activeTitle = PREP_SECTIONS.find(s => s.id === activeSectionId)?.title
            const match = session.sections?.find(s => s.title === activeTitle)
            setEditContent(match ? match.content : "")
          }
        } catch (err) {
          console.error("Failed to load prep session:", err)
        }
      }
      fetchPrepSession()
    }
  }, [selectedJobId])

  // Sync editContent when changing active section tabs
  useEffect(() => {
    if (prepSession) {
      const activeTitle = PREP_SECTIONS.find(s => s.id === activeSectionId)?.title
      const match = prepSession.sections?.find(s => s.title === activeTitle)
      setEditContent(match ? match.content : "")
    } else {
      setEditContent("")
    }
  }, [activeSectionId, prepSession])

  const handleGeneratePrep = async () => {
    if (!selectedJobId) return
    setMessage({ text: "", type: "" })

    try {
      const session = await generatePrepAsync.execute(selectedJobId)
      setPrepSession(session)
      showToast("Interview study guide generated successfully!", "success")
    } catch (err) {
      showToast(err.message || "Failed to generate prep guide. Ensure FORGE_API_KEY is configured.", "error")
    }
  }

  const handleSaveEdits = async () => {
    if (!prepSession) return
    setMessage({ text: "", type: "" })

    const activeTitle = PREP_SECTIONS.find(s => s.id === activeSectionId)?.title
    
    // Build updated sections array
    const updatedSections = prepSession.sections.map(section => {
      if (section.title === activeTitle) {
        return { ...section, content: editContent }
      }
      return section
    })

    // If section wasn't present, add it
    if (!updatedSections.some(s => s.title === activeTitle)) {
      updatedSections.push({ title: activeTitle, content: editContent })
    }

    try {
      const updated = await savePrepAsync.execute(prepSession._id, updatedSections)
      setPrepSession(updated)
      showToast("Edits and notes saved successfully to MongoDB!", "success")
    } catch (err) {
      showToast("Failed to save edits.", "error")
    }
  }

  const handleDeleteSession = async () => {
    if (!prepSession) return
    if (!window.confirm("Are you sure you want to reset this interview preparation guide? This will clear all custom notes.")) return

    try {
      await api.deletePrep(prepSession._id)
      setPrepSession(null)
      setEditContent("")
      showToast("Study guide reset successfully.", "success")
    } catch (err) {
      showToast("Failed to reset session.", "error")
    }
  }

  const handleCopySection = () => {
    if (!editContent) return
    navigator.clipboard.writeText(editContent)
    showToast("Section content copied to clipboard!", "success")
  }

  const showToast = (text, type = "success") => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: "", type: "" }), 5000)
  }

  const selectedJob = jobs.find(j => j._id === selectedJobId)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 transition-colors duration-300">
      
      {/* Title Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-indigo-950 dark:text-white mb-2 tracking-tight">🗣 AI Interview Prep</h1>
        <p className="text-gray-550 dark:text-slate-400 max-w-2xl mx-auto">Generate company research, coding challenges, behavioral templates, and negotiation guides customized by Claude.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-semibold border-l-4 ${message.type === "success" ? "bg-green-50 text-green-800 border-green-500 dark:bg-green-950/20 dark:text-green-400" : "bg-red-50 text-red-800 border-red-500 dark:bg-red-950/20 dark:text-red-400"}`}>
          {message.text}
        </div>
      )}

      {/* Main Grid View */}
      <div className="grid lg:grid-cols-5 gap-8 items-start">
        {/* Left selector panel (Cols: 2) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5 border dark:border-slate-800 space-y-4">
            <h2 className="text-md font-bold text-gray-800 dark:text-white">
              Target Selection
            </h2>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                Select Job Application
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-gray-250 dark:border-slate-800 dark:bg-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {jobs.map(j => (
                  <option key={j._id} value={j._id}>
                    {j.role} at {j.company} ({j.status})
                  </option>
                ))}
                {jobs.length === 0 && <option value="">No jobs added yet</option>}
              </select>
            </div>

            {selectedJob && (
              <div className="p-3.5 bg-gray-50/50 dark:bg-slate-950/20 border dark:border-slate-850 rounded-xl text-xs space-y-2">
                <div>
                  <span className="font-bold text-gray-550 dark:text-slate-400">Position:</span>{" "}
                  <span className="font-semibold text-gray-800 dark:text-white">{selectedJob.role}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-550 dark:text-slate-400">Company:</span>{" "}
                  <span className="font-semibold text-gray-800 dark:text-white">{selectedJob.company}</span>
                </div>
              </div>
            )}

            {!prepSession && selectedJobId && (
              <Button
                onClick={handleGeneratePrep}
                variant="primary"
                className="w-full py-3 bg-indigo-650"
                loading={generatePrepAsync.loading}
              >
                ✨ Generate Study Guide (Claude)
              </Button>
            )}

            {!hasProfile && (
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-xl text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                Note: Your Master Profile is empty. Fill it out in the Master Profile tab to get highly tailored resume and behavioral questions.
              </div>
            )}
          </Card>

          {/* Tab navigator for sections */}
          {prepSession && (
            <Card className="p-3 border dark:border-slate-800 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-black px-3.5 pb-2 block border-b dark:border-slate-850">Study Modules</span>
              {PREP_SECTIONS.map(s => {
                const isActive = activeSectionId === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSectionId(s.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${isActive ? "bg-indigo-50 text-indigo-750 dark:bg-slate-850 dark:text-indigo-400" : "text-gray-550 hover:bg-gray-50/50 dark:text-slate-400 dark:hover:bg-slate-850/50"}`}
                  >
                    <span>{s.icon}</span>
                    <span>{s.title}</span>
                  </button>
                )
              })}
            </Card>
          )}
        </div>

        {/* Study Console Editor Area (Cols: 3) */}
        <div className="lg:col-span-3">
          <Card className="p-6 min-h-[500px] border dark:border-slate-800 flex flex-col">
            
            {/* Generating Loader */}
            {generatePrepAsync.loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                <LoadingSpinner size="lg" message="Claude Sonnet is analyzing JD & Profile details..." />
                <p className="text-xs text-gray-450 dark:text-slate-500 max-w-xs leading-relaxed">We are writing customized system designs, behavioralSTAR responses, LeetCode topics, and revision summaries.</p>
              </div>
            )}

            {/* Empty placeholder */}
            {!prepSession && !generatePrepAsync.loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 dark:text-slate-550 py-20">
                <span className="text-6xl mb-4">🗣</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-200">No Prep Guide generated.</p>
                <p className="text-xs mt-1 text-gray-500 dark:text-slate-400">Select an active job and click "Generate Study Guide" to synthesize interview materials.</p>
              </div>
            )}

            {/* Study Console */}
            {prepSession && !generatePrepAsync.loading && (
              <div className="flex-1 flex flex-col space-y-5 animate-fadeIn">
                <div className="flex justify-between items-center border-b dark:border-slate-850 pb-3.5">
                  <div>
                    <span className="text-[10px] uppercase font-black text-indigo-650 dark:text-indigo-400">Preparation Deck</span>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mt-0.5">
                      {PREP_SECTIONS.find(s => s.id === activeSectionId)?.title}
                    </h3>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={handleCopySection} className="text-xs font-bold">
                      📋 Copy
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSaveEdits} loading={savePrepAsync.loading} className="text-xs font-bold bg-indigo-650">
                      💾 Save Changes
                    </Button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col space-y-2">
                  <label className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                    Interactive Content Workspace & Review Notes
                  </label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1 w-full h-[400px] text-xs px-4 py-3 rounded-2xl border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono leading-relaxed"
                    placeholder="Write custom notes, study details or copy-paste feedback here..."
                  />
                </div>

                <div className="flex justify-start border-t dark:border-slate-850 pt-4">
                  <button
                    type="button"
                    onClick={handleDeleteSession}
                    className="text-xs text-red-500 hover:underline font-bold"
                  >
                    🗑 Reset study guide
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
