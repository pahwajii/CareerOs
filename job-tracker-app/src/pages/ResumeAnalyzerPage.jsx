import { useState, useEffect } from "react"
import { api } from "../services/api"
import useAsync from "../hooks/useAsync"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import FileUpload from "../components/ui/FileUpload"
import LoadingSpinner from "../components/ui/LoadingSpinner"

export default function ResumeAnalyzerPage() {
  const [matchMode, setMatchMode] = useState("profile") // "profile" | "text" | "tailor" | "outreach"
  const [resumeText, setResumeText] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [hasProfile, setHasProfile] = useState(false)

  // Job Selectors for tailoring/outreach
  const [jobs, setJobs] = useState([])
  const [selectedJobId, setSelectedJobId] = useState("")
  const [tailorHistory, setTailorHistory] = useState([])
  const [loadingKimi, setLoadingKimi] = useState(false)
  const [loadingClaude, setLoadingClaude] = useState(false)
  const [loadingOpus, setLoadingOpus] = useState(false)
  const [opusTimeLeft, setOpusTimeLeft] = useState(300)

  // Outreach assistant state variables
  const [outreachType, setOutreachType] = useState("Cover Letter")
  const [outreachTone, setOutreachTone] = useState("Professional")
  const [outreachSubject, setOutreachSubject] = useState("")
  const [outreachContent, setOutreachContent] = useState("")
  const [outreachHistory, setOutreachHistory] = useState([])

  // Async executors
  const uploadAsync = useAsync(api.uploadResumeFile)
  const analyzeTextAsync = useAsync(api.analyzeResume)
  const analyzeProfileAsync = useAsync(api.matchAnalyze)
  const tailorResumeAsync = useAsync(api.tailorResume)
  const generateOutreachAsync = useAsync(api.generateOutreach)
  const saveOutreachAsync = useAsync(api.saveOutreach)

  // Load configuration details on mount
  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      const user = JSON.parse(userStr)
      if (user.resumeText) {
        setResumeText(user.resumeText)
      }
    }

    // Check if user has active Master Profile details set
    const fetchProfileCheck = async () => {
      try {
        const data = await api.getProfile()
        if (data && (data.skills?.length > 0 || data.experience?.length > 0 || data.projects?.length > 0)) {
          setHasProfile(true)
        }
      } catch (err) {
        console.error("Profile check failed:", err)
      }
    }

    // Load active jobs list
    const fetchJobsCheck = async () => {
      try {
        const data = await api.getJobs()
        setJobs(data || [])
        if (data && data.length > 0) {
          setSelectedJobId(data[0]._id)
        }
      } catch (err) {
        console.error("Jobs load failed:", err)
      }
    }

    fetchProfileCheck()
    fetchJobsCheck()
  }, [])

  // Load history list when a job selection changes in Tailoring/Outreach tabs
  useEffect(() => {
    if (selectedJobId) {
      const fetchHistory = async () => {
        try {
          if (matchMode === "tailor") {
            const data = await api.getTailoredHistories(selectedJobId)
            setTailorHistory(data || [])
          } else if (matchMode === "outreach") {
            const data = await api.getOutreachHistories(selectedJobId)
            setOutreachHistory(data || [])
          }
        } catch (err) {
          console.error("Failed to load histories:", err)
        }
      }
      fetchHistory()
    }
  }, [selectedJobId, matchMode])

  const handleUploadResume = async (e) => {
    if (e) e.preventDefault()
    if (!file) return

    setMessage({ text: "", type: "" })

    const formData = new FormData()
    formData.append("resume", file)

    try {
      const data = await uploadAsync.execute(formData)
      setResumeText(data.resumeText || "")
      setMessage({ text: "Resume uploaded and text extracted successfully!", type: "success" })
      setFile(null)
    } catch (err) {
      setMessage({ text: err.message || "Failed to parse PDF.", type: "error" })
    }
  }

  const handleRunAnalysis = async (e) => {
    e.preventDefault()
    if (!jobDescription.trim()) return

    try {
      if (matchMode === "profile") {
        await analyzeProfileAsync.execute(jobDescription)
      } else {
        await analyzeTextAsync.execute(resumeText, jobDescription)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleRunTailoring = async (e) => {
    e.preventDefault()
    if (!selectedJobId) return

    setLoadingKimi(true)
    showToast("Launching AI tailoring with gpt-5.6-sol...", "info")

    api.tailorResume(selectedJobId, null)
      .then(data => {
        setTailorHistory(prev => [data, ...prev])
        showToast("Resume tailored successfully!", "success")
      })
      .catch(err => {
        console.error("Tailoring failed:", err)
        showToast("Tailoring failed: " + (err.message || err), "error")
      })
      .finally(() => setLoadingKimi(false))
  }

  const handleRunPremiumTailoring = (e) => {
    e.preventDefault()
    if (!selectedJobId || loadingOpus) return

    setLoadingOpus(true)
    setOpusTimeLeft(300)
    showToast("✨ Claude Opus Premium tailoring started — this may take up to 5 minutes...", "info")

    // Live countdown timer
    const interval = setInterval(() => {
      setOpusTimeLeft(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)

    api.tailorResume(selectedJobId, "claude-opus-4-5-20251101")
      .then(data => {
        clearInterval(interval)
        setTailorHistory(prev => [data, ...prev])
        showToast("👑 Claude Opus Premium resume tailored successfully!", "success")
      })
      .catch(err => {
        clearInterval(interval)
        console.error("Premium tailoring failed:", err)
        showToast("Premium tailoring failed: " + (err.message || err), "error")
      })
      .finally(() => {
        setLoadingOpus(false)
        setOpusTimeLeft(300)
      })
  }

  const handleDownloadFile = async (id, fileType, defaultName) => {
    try {
      const blob = await api.downloadTailoredFile(id, fileType)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", defaultName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert("Failed to download the generated file.")
    }
  }

  // Trigger outreach drafting via GPT-5.5
  const handleGenerateOutreach = async (e) => {
    e.preventDefault()
    if (!selectedJobId) return
    setMessage({ text: "", type: "" })

    try {
      const response = await generateOutreachAsync.execute(selectedJobId, outreachType, outreachTone)
      setOutreachSubject(response.subject || "")
      setOutreachContent(response.content || "")
      showToast(`${outreachType} drafted successfully! Feel free to edit below before saving.`, "success")
    } catch (err) {
      showToast(err.message || "Outreach drafting failed.", "error")
    }
  }

  // Save modified outreach script to MongoDB
  const handleSaveOutreach = async () => {
    if (!selectedJobId || !outreachContent.trim()) return
    setMessage({ text: "", type: "" })

    try {
      const data = await saveOutreachAsync.execute({
        jobId: selectedJobId,
        type: outreachType,
        tone: outreachTone,
        subject: outreachSubject,
        content: outreachContent
      })
      setOutreachHistory(prev => [data, ...prev])
      showToast("Outreach template saved successfully to MongoDB!", "success")
      setOutreachSubject("")
      setOutreachContent("")
    } catch (err) {
      showToast(err.message || "Failed to save template.", "error")
    }
  }

  const handleDeleteOutreach = async (id) => {
    if (!window.confirm("Are you sure you want to delete this outreach script?")) return
    try {
      await api.deleteOutreach(id)
      setOutreachHistory(prev => prev.filter(item => item._id !== id))
      showToast("Outreach template deleted successfully.", "success")
    } catch (err) {
      showToast("Failed to delete outreach template.", "error")
    }
  }

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text)
    showToast("Copied to clipboard!", "success")
  }

  const showToast = (text, type = "success") => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: "", type: "" }), 5000)
  }

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-500 stroke-emerald-500 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/40"
    if (score >= 50) return "text-amber-500 stroke-amber-500 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/40"
    return "text-rose-500 stroke-rose-500 bg-rose-50 border-rose-100 dark:text-rose-400 dark:bg-rose-950/20 dark:border-rose-900/40"
  }

  const activeData = matchMode === "profile" ? analyzeProfileAsync.data : analyzeTextAsync.data
  const activeLoading = matchMode === "profile" ? analyzeProfileAsync.loading : analyzeTextAsync.loading
  const activeError = matchMode === "profile" ? analyzeProfileAsync.error : analyzeTextAsync.error

  const selectedJob = jobs.find(j => j._id === selectedJobId)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 transition-colors duration-300">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-indigo-950 dark:text-white mb-2 tracking-tight">🔍 AI Match & Tailor Engine</h1>
        <p className="text-gray-550 dark:text-slate-400 max-w-2xl mx-auto">Evaluate profile compatibility or automatically generate tailored resumes and outreach scripts for active jobs.</p>
      </div>

      {/* Match Mode Selection Tab Bar */}
      <div className="flex justify-center mb-8">
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-1.5 rounded-2xl flex flex-wrap gap-1.5 shadow-sm justify-center">
          <button
            onClick={() => {
              setMatchMode("profile")
              setMessage({ text: "", type: "" })
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              matchMode === "profile"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-550 hover:text-gray-900 dark:text-slate-450 dark:hover:text-white"
            }`}
          >
            👤 Use Master Profile
          </button>
          <button
            onClick={() => {
              setMatchMode("text")
              setMessage({ text: "", type: "" })
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              matchMode === "text"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-550 hover:text-gray-900 dark:text-slate-450 dark:hover:text-white"
            }`}
          >
            📄 Use Custom PDF / Text
          </button>
          <button
            onClick={() => {
              setMatchMode("tailor")
              setMessage({ text: "", type: "" })
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              matchMode === "tailor"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-550 hover:text-gray-900 dark:text-slate-450 dark:hover:text-white"
            }`}
          >
            ✨ Resume Tailoring
          </button>
          <button
            onClick={() => {
              setMatchMode("outreach")
              setMessage({ text: "", type: "" })
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              matchMode === "outreach"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-550 hover:text-gray-900 dark:text-slate-450 dark:hover:text-white"
            }`}
          >
            ✉ Outreach Assistant {hasProfile && "🔑"}
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-semibold border-l-4 ${message.type === "success" ? "bg-green-50 text-green-800 border-green-500 dark:bg-green-950/20 dark:text-green-400" : "bg-red-50 text-red-800 border-red-500 dark:bg-red-950/20 dark:text-red-400"}`}>
          {message.text}
        </div>
      )}

      {/* Main Split Grid */}
      <div className="grid lg:grid-cols-5 gap-8 items-start">
        {/* Input Panel (Cols: 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* OPTION A: Master profile details check */}
          {matchMode === "profile" && (
            <Card className="p-5 border dark:border-slate-800 space-y-3.5">
              <h2 className="text-md font-bold text-gray-800 dark:text-white flex items-center gap-2">
                👤 Stored Career Profile
              </h2>
              {hasProfile ? (
                <div className="p-3.5 rounded-xl bg-green-50/50 dark:bg-green-950/10 border border-green-100 dark:border-green-900/30 text-xs font-semibold text-green-700 dark:text-green-400">
                  Ready! Master profile detected containing skill tags, experiences, and project lists.
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  No comprehensive profile found. Please configure your profile first or use the "AI Profile Builder" inside the Master Profile page.
                </div>
              )}
            </Card>
          )}

          {/* OPTION B: Raw text resume fields */}
          {matchMode === "text" && (
            <Card className="p-5 border dark:border-slate-800 space-y-4">
              <h2 className="text-md font-bold text-gray-800 dark:text-white flex items-center gap-2">
                📄 Custom Resume PDF Upload
              </h2>
              
              <div className="space-y-4">
                <FileUpload
                  onFileSelect={setFile}
                  uploading={uploadAsync.loading}
                  accept=".pdf"
                  helperText="Drop resume PDF file here"
                />

                {file && (
                  <Button
                    variant="primary"
                    className="w-full py-2.5"
                    onClick={handleUploadResume}
                    loading={uploadAsync.loading}
                  >
                    Extract PDF Text
                  </Button>
                )}
              </div>

              <Input
                label="Raw Resume Content (Editable Preview)"
                as="textarea"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Upload PDF above or paste resume content directly here..."
                className="h-28 text-xs font-medium"
              />
            </Card>
          )}

          {/* OPTION C: Active Job Selector and tailoring details */}
          {matchMode === "tailor" && (
            <Card className="p-5 border dark:border-slate-800 space-y-4">
              <h2 className="text-md font-bold text-gray-800 dark:text-white">
                ✨ Resume Tailoring Settings
              </h2>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Select Target Job Application
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
                <div className="space-y-3 p-3.5 bg-gray-50/50 dark:bg-slate-950/20 border dark:border-slate-850 rounded-xl text-xs leading-relaxed">
                  <div>
                    <span className="font-bold text-gray-550 dark:text-slate-400">Position:</span>{" "}
                    <span className="font-semibold text-gray-800 dark:text-white">{selectedJob.role}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-550 dark:text-slate-400">Company:</span>{" "}
                    <span className="font-semibold text-gray-800 dark:text-white">{selectedJob.company}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-550 dark:text-slate-400">Job Description Preview:</span>
                    <p className="text-gray-600 dark:text-slate-400 mt-1 line-clamp-4 leading-normal">{selectedJob.jobDescription}</p>
                  </div>
                </div>
              )}

              {selectedJobId ? (
                <div className="space-y-3">
                  <Button
                    onClick={handleRunTailoring}
                    variant="primary"
                    className="w-full py-3"
                    loading={loadingKimi}
                    disabled={loadingOpus}
                  >
                    ✨ Run AI Tailoring (gpt-5.6-sol)
                  </Button>

                  {/* Premium Claude Opus Button */}
                  <button
                    onClick={handleRunPremiumTailoring}
                    disabled={loadingOpus || loadingKimi}
                    className="w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-white shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-amber-400/30"
                  >
                    {loadingOpus ? (
                      <>
                        <span className="inline-block animate-spin">⏳</span>
                        <span>
                          Claude Opus working... {Math.floor(opusTimeLeft / 60)}:{String(opusTimeLeft % 60).padStart(2, "0")} left
                        </span>
                      </>
                    ) : (
                      <>
                        <span>👑</span>
                        <span>Premium — Claude Opus</span>
                        <span className="text-[10px] font-black bg-white/20 px-1.5 py-0.5 rounded ml-1">5 MIN</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-xs text-center text-gray-400 italic py-2">
                  Add a job application to start tailoring.
                </div>
              )}
            </Card>
          )}

          {/* OPTION D: Outreach Settings Form (tone, template selection) */}
          {matchMode === "outreach" && (
            <Card className="p-5 border dark:border-slate-800 space-y-4">
              <h2 className="text-md font-bold text-gray-800 dark:text-white">
                ✉ Outreach Assistant Settings
              </h2>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Select Target Job Application
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Outreach Type
                  </label>
                  <select
                    value={outreachType}
                    onChange={(e) => setOutreachType(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-gray-250 dark:border-slate-800 dark:bg-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {["Cover Letter", "Email", "Referral Request", "LinkedIn Message", "Cold Email", "Follow-up", "Thank You Email"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Pitch Tone
                  </label>
                  <select
                    value={outreachTone}
                    onChange={(e) => setOutreachTone(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-gray-250 dark:border-slate-800 dark:bg-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {["Professional", "Confident", "Enthusiastic", "Formal", "Bold"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedJobId ? (
                <Button
                  onClick={handleGenerateOutreach}
                  variant="primary"
                  className="w-full py-3 bg-indigo-650"
                  loading={generateOutreachAsync.loading}
                >
                  ✨ Generate Draft (GPT-5.5)
                </Button>
              ) : (
                <div className="text-xs text-center text-gray-400 italic py-2">
                  Add a job application to start generating.
                </div>
              )}
            </Card>
          )}

          {/* Job Description Card (Only for Matching Modes) */}
          {matchMode !== "tailor" && matchMode !== "outreach" && (
            <Card className="p-5 border dark:border-slate-800 space-y-4">
              <h2 className="text-md font-bold text-gray-800 dark:text-white flex items-center gap-2">
                💼 Target Job Description
              </h2>
              <form onSubmit={handleRunAnalysis} className="space-y-4">
                <Input
                  as="textarea"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the target job description details here..."
                  className="h-44 text-xs font-medium"
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3"
                  loading={activeLoading}
                  disabled={matchMode === "text" && !resumeText.trim()}
                >
                  📊 Trigger AI Match Engine
                </Button>
              </form>
            </Card>
          )}
        </div>

        {/* Results Panel (Cols: 3) */}
        <div className="lg:col-span-3">
          <Card className="p-6 min-h-[500px] border dark:border-slate-800">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2 tracking-tight">
              📊 {matchMode === "tailor" ? "Tailored Resume Versions" : matchMode === "outreach" ? "Outreach Editor Console" : "Match Insights Report"}
            </h2>

            {/* OUTREACH WRITER RESULTS RENDERING */}
            {matchMode === "outreach" && (
              <div className="space-y-6">
                {generateOutreachAsync.loading && (
                  <div className="flex flex-col items-center justify-center text-center h-[350px] space-y-4">
                    <LoadingSpinner size="lg" message={`GPT-5.5 is drafting your custom ${outreachType}...`} />
                    <p className="text-xs text-gray-450 dark:text-slate-500 max-w-xs leading-relaxed">We are matching target requirements against your Master Career Profile, maintaining a {outreachTone} tone.</p>
                  </div>
                )}

                {/* Main draft editor (shows after generation or when content exists) */}
                {!generateOutreachAsync.loading && (outreachContent.trim() !== "" || outreachSubject.trim() !== "") && (
                  <div className="space-y-4 animate-fadeIn p-4 border dark:border-slate-800 bg-indigo-50/5 dark:bg-slate-950/10 rounded-2xl">
                    <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-black text-indigo-650 dark:text-indigo-400">Template Preview & Editor</span>
                        <h4 className="text-xs font-bold text-gray-450 mt-0.5">{outreachType} ({outreachTone} Tone)</h4>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCopyText(outreachContent)}
                          className="text-xs font-bold"
                        >
                          📋 Copy
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSaveOutreach}
                          loading={saveOutreachAsync.loading}
                          className="text-xs font-bold bg-indigo-650"
                        >
                          💾 Save to MongoDB
                        </Button>
                      </div>
                    </div>

                    {/* Email Subject field if applicable */}
                    {["Email", "Cold Email", "Follow-up", "Thank You Email"].includes(outreachType) && (
                      <div className="space-y-1.5">
                        <Input
                          label="Email Subject Line"
                          value={outreachSubject}
                          onChange={(e) => setOutreachSubject(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                        Message Content (Editable text area)
                      </label>
                      <textarea
                        value={outreachContent}
                        onChange={(e) => setOutreachContent(e.target.value)}
                        className="w-full h-80 text-xs px-3.5 py-3 rounded-xl border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {/* Outreach History list logs below */}
                {!generateOutreachAsync.loading && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b dark:border-slate-850 pb-2">
                      Saved Scripts History ({outreachHistory.length})
                    </h3>

                    {outreachHistory.map((item) => (
                      <div key={item._id} className="border dark:border-slate-850 rounded-xl p-4 space-y-3 bg-white dark:bg-slate-900 shadow-xs relative hover:border-indigo-150 transition">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                              <span className="bg-indigo-50 text-indigo-750 dark:bg-slate-850 dark:text-indigo-400 px-2 py-0.5 rounded">{item.type}</span>
                              <span className="bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded">{item.tone} Tone</span>
                              <span className="text-gray-400 font-normal">{new Date(item.createdAt).toLocaleDateString()}</span>
                            </div>
                            {item.subject && <h4 className="text-xs font-bold text-gray-800 dark:text-white mt-2">Subject: {item.subject}</h4>}
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyText(item.content)}
                              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOutreach(item._id)}
                              className="text-xs font-bold text-red-500 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="h-28 overflow-y-auto bg-gray-50 dark:bg-slate-950/20 p-3 rounded-lg border dark:border-slate-850 font-mono text-[10px] whitespace-pre-wrap leading-normal">
                          {item.content}
                        </div>
                      </div>
                    ))}

                    {outreachHistory.length === 0 && (outreachContent.trim() === "" && outreachSubject.trim() === "") && (
                      <div className="flex flex-col items-center justify-center text-center h-[200px] text-gray-400 dark:text-slate-550">
                        <span className="text-4xl mb-2">✉</span>
                        <p className="text-xs font-semibold text-gray-900 dark:text-slate-200">No outreach history.</p>
                        <p className="text-[10px] mt-0.5 text-gray-500">Draft outreach scripts using the generator options above.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAILORING RESULTS RENDERING */}
            {matchMode === "tailor" && (
              <div className="space-y-6">
                {(loadingKimi || loadingOpus) && (
                  <div className="flex flex-col items-center justify-center text-center h-[350px] space-y-4">
                    <LoadingSpinner
                      size="lg"
                      message={loadingOpus ? `👑 Claude Opus Premium is optimizing your resume...` : "Tailoring your resume with gpt-5.6-sol..."}
                    />
                    {loadingOpus && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-3xl font-black text-amber-500">
                          {Math.floor(opusTimeLeft / 60)}:{String(opusTimeLeft % 60).padStart(2, "0")}
                        </div>
                        <p className="text-xs text-gray-450 dark:text-slate-500 max-w-xs leading-relaxed">
                          Claude Opus runs a deeper optimization pass — crafting the highest-quality ATS-tuned bullets. Hang tight!
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {!(loadingKimi || loadingClaude) && tailorHistory.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-center h-[350px] text-gray-400 dark:text-slate-550">
                    <span className="text-6xl mb-4">✨</span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-200">No tailored versions found.</p>
                    <p className="text-xs mt-1 text-gray-500 dark:text-slate-400">Click "Run AI Wording Tailoring" to build your first tailored resume for this job.</p>
                  </div>
                )}

                {tailorHistory.length > 0 && (
                  <div className="space-y-6 animate-fadeIn">
                    {tailorHistory.map((version, idx) => (
                      <div key={version._id} className={`border rounded-2xl p-5 space-y-5 transition duration-150 ${idx === 0 ? "bg-indigo-50/5 dark:bg-slate-900/40 border-indigo-150 dark:border-slate-800" : "bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800"}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b dark:border-slate-850 pb-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs bg-indigo-600 text-white font-bold px-2 py-0.5 rounded">Version {tailorHistory.length - idx}</span>
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2 py-0.5 rounded border dark:border-slate-700/60 uppercase">
                                {version.modelUsed === "kimi-k2.7-code" ? "Kimi 2.7 (Fast)" : version.modelUsed?.includes("claude-opus") ? "👑 Claude Opus (Premium)" : version.modelUsed === "claude-sonnet-4-6" ? "Claude Sonnet" : version.modelUsed || "gpt-5.6-sol"}
                              </span>
                              {version.pdfCompiled === false && (
                                <span className="text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/30 uppercase">
                                  ⚠️ Compiler Fallback
                                </span>
                              )}
                              <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold">{new Date(version.createdAt).toLocaleString()}</span>
                            </div>
                            <h4 className="text-sm font-bold text-indigo-950 dark:text-white mt-1.5">{version.position} at {version.company}</h4>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDownloadFile(version._id, "pdf", `${version.company.replace(/\s+/g,"_")}_Resume.pdf`)}
                              className={`text-xs font-bold ${version.pdfCompiled === false ? 'border-amber-300 text-amber-700 dark:text-amber-400 dark:border-amber-900/40' : ''}`}
                              title={version.pdfCompiled === false ? "PDF was built using compiler fallback. Install tectonic or pdflatex for high-fidelity LaTeX PDFs." : "Download PDF Resume"}
                            >
                              📥 PDF {version.pdfCompiled === false && "⚠️"}
                            </Button>
                            {version.docxFileName ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDownloadFile(version._id, "docx", `${version.company.replace(/\s+/g,"_")}_Resume.docx`)}
                                className="text-xs font-bold"
                              >
                                📥 DOCX
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled
                                title="DOCX generation requires Pandoc on the backend server"
                                className="text-xs font-bold opacity-40 cursor-not-allowed"
                              >
                                📥 DOCX
                              </Button>
                            )}
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleDownloadFile(version._id, "tex", `${version.company.replace(/\s+/g,"_")}_Resume.tex`)}
                              className="text-xs font-bold bg-indigo-650"
                            >
                              📥 LaTeX
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center items-center">
                          <div className="p-3 bg-gray-50 dark:bg-slate-950/20 border dark:border-slate-850 rounded-xl">
                            <span className="text-[10px] text-gray-450 uppercase font-black">ATS Score</span>
                            <p className="text-lg font-black text-indigo-950 dark:text-white mt-0.5">{version.atsScore}%</p>
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-slate-950/20 border dark:border-slate-850 rounded-xl">
                            <span className="text-[10px] text-gray-450 uppercase font-black">Keywords</span>
                            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{version.keywordCoverage?.length || 0} Met</p>
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-slate-950/20 border dark:border-slate-850 rounded-xl">
                            <span className="text-[10px] text-gray-450 uppercase font-black">Gaps</span>
                            <p className="text-lg font-black text-rose-500 mt-0.5">{version.missingSkills?.length || 0} Left</p>
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-slate-950/20 border dark:border-slate-850 rounded-xl">
                            <span className="text-[10px] text-gray-450 uppercase font-black">Tips</span>
                            <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{version.suggestions?.length || 0} Items</p>
                          </div>
                        </div>

                        {version.missingSkills?.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Remaining Gaps</span>
                            <div className="flex flex-wrap gap-1.5">
                              {version.missingSkills.map((s, i) => (
                                <span key={i} className="bg-rose-50 dark:bg-rose-950/10 text-rose-700 dark:text-rose-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border dark:border-rose-900/30">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {version.suggestions?.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Optimization Feedback</span>
                            <ul className="space-y-1 text-[11px] text-gray-600 dark:text-slate-300 list-disc list-inside leading-normal">
                              {version.suggestions.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="space-y-1.5 pt-2">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tailored LaTeX Source Preview</span>
                          <div className="h-44 overflow-y-auto bg-slate-900 text-slate-100 p-4 rounded-xl border dark:border-slate-800 font-mono text-[10px] whitespace-pre-wrap leading-normal">
                            {version.tailoredText}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MATCH REPORT RENDERING (Only for Matching Modes) */}
            {matchMode !== "tailor" && matchMode !== "outreach" && (
              <div>
                {!activeData && !activeLoading && (
                  <div className="flex flex-col items-center justify-center text-center h-[400px] text-gray-400 dark:text-slate-550">
                    <span className="text-6xl mb-4">🎯</span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-200">Insights will populate here.</p>
                    <p className="text-xs mt-1 text-gray-500 dark:text-slate-400">Provide job description requirements and click "Trigger AI Match Engine".</p>
                  </div>
                )}

                {activeLoading && (
                  <div className="flex flex-col items-center justify-center text-center h-[400px] space-y-4">
                    <LoadingSpinner size="lg" message="DeepSeek R1 is executing match logic..." />
                    <p className="text-xs text-gray-450 dark:text-slate-500 max-w-xs leading-relaxed">We are analyzing skills matches, project compatibility, experience layers, and structural alignment gaps.</p>
                  </div>
                )}

                {activeData && (
                  <div className="space-y-8 animate-fadeIn">
                    <div className="grid sm:grid-cols-2 gap-6 items-center bg-gray-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border dark:border-slate-850">
                      <div className="flex flex-col items-center justify-center text-center space-y-2">
                        <h3 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Overall Match</h3>
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="56"
                              cy="56"
                              r="48"
                              className="stroke-gray-200 dark:stroke-slate-800"
                              strokeWidth="8"
                              fill="transparent"
                            />
                            <circle
                              cx="56"
                              cy="56"
                              r="48"
                              className={`${getScoreColor(activeData.overallMatch || activeData.matchScore || 0)}`}
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 48}
                              strokeDashoffset={2 * Math.PI * 48 * (1 - (activeData.overallMatch || activeData.matchScore || 0) / 100)}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute text-3xl font-black text-indigo-950 dark:text-white">
                            {activeData.overallMatch || activeData.matchScore || 0}%
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs font-bold text-gray-655 dark:text-slate-350">
                        <h3 className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Breakdown metrics</h3>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Skills Match</span>
                            <span>{activeData.skillsMatch !== undefined ? activeData.skillsMatch : (activeData.matchScore || 50)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-650 dark:bg-indigo-400 rounded-full transition-all duration-500"
                              style={{ width: `${activeData.skillsMatch !== undefined ? activeData.skillsMatch : (activeData.matchScore || 50)}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Experience Match</span>
                            <span>{activeData.experienceMatch !== undefined ? activeData.experienceMatch : (activeData.matchScore - 5 || 45)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${activeData.experienceMatch !== undefined ? activeData.experienceMatch : (activeData.matchScore - 5 || 45)}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Project Match</span>
                            <span>{activeData.projectMatch !== undefined ? activeData.projectMatch : (activeData.matchScore - 10 || 40)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 dark:bg-amber-400 rounded-full transition-all duration-500"
                              style={{ width: `${activeData.projectMatch !== undefined ? activeData.projectMatch : (activeData.matchScore - 10 || 40)}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Education Match</span>
                            <span>{activeData.educationMatch !== undefined ? activeData.educationMatch : (activeData.matchScore + 5 || 55)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-400 dark:bg-indigo-350 rounded-full transition-all duration-500"
                              style={{ width: `${activeData.educationMatch !== undefined ? activeData.educationMatch : (activeData.matchScore + 5 || 55)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Missing Keywords / Gap areas</h3>
                      <div className="flex flex-wrap gap-2">
                        {activeData.missingKeywords && activeData.missingKeywords.length > 0 ? (
                          activeData.missingKeywords.map((word, i) => (
                            <span key={i} className="bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 font-bold px-3 py-1.5 rounded-xl text-xs border border-amber-100 dark:border-amber-900/40">
                              {word}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-green-600 dark:text-green-400 italic">No missing keywords identified. Great fit!</span>
                        )}
                      </div>
                    </div>

                    {matchMode === "profile" && (
                      <div className="space-y-6 pt-4 border-t dark:border-slate-850">
                        <div className="space-y-2.5">
                          <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">💪 Key Strengths</h4>
                          <ul className="space-y-2">
                            {activeData.strengths && activeData.strengths.map((str, idx) => (
                              <li key={idx} className="flex gap-2 text-xs text-gray-655 dark:text-slate-350 leading-relaxed items-start">
                                <span className="text-emerald-500 mt-0.5">✔</span>
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-2.5">
                          <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">⚠️ Gap Areas (Weaknesses)</h4>
                          <ul className="space-y-2">
                            {activeData.weaknesses && activeData.weaknesses.map((wk, idx) => (
                              <li key={idx} className="flex gap-2 text-xs text-gray-655 dark:text-slate-350 leading-relaxed items-start">
                                <span className="text-rose-500 mt-0.5">🛈</span>
                                <span>{wk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-2.5">
                          <h4 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider">💡 Actionable Tailoring Feedback</h4>
                          <ul className="space-y-2">
                            {activeData.suggestions && activeData.suggestions.map((sug, idx) => (
                              <li key={idx} className="flex gap-2 text-xs text-gray-655 dark:text-slate-350 leading-relaxed items-start">
                                <span className="text-indigo-500 mt-0.5">💡</span>
                                <span>{sug}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {matchMode === "text" && (
                      <div className="space-y-2.5 pt-4 border-t dark:border-slate-850">
                        <h4 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider">💡 Tailoring suggestions</h4>
                        <ul className="space-y-2">
                          {activeData.tailoringSuggestions && activeData.tailoringSuggestions.map((tip, idx) => (
                            <li key={idx} className="flex gap-2 text-xs text-gray-655 dark:text-slate-350 leading-relaxed items-start">
                              <span className="text-indigo-500 mt-0.5">💡</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
