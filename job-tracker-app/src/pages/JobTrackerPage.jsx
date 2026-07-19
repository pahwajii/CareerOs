import { useState, useEffect } from "react"
import useJobs from "../hooks/useJobs"
import { api } from "../services/api"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import EmptyState from "../components/ui/EmptyState"

const STATUSES = ["saved", "applied", "oa", "interview", "hr", "offer", "rejected", "withdrawn"]

const STATUS_CONFIG = {
  saved: { label: "Saved", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  applied: { label: "Applied", color: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30" },
  oa: { label: "OA (Online Test)", color: "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30" },
  interview: { label: "Interviewing", color: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30" },
  hr: { label: "HR Round", color: "bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/30" },
  offer: { label: "Offer Received", color: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30" },
  rejected: { label: "Rejected", color: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30" },
  withdrawn: { label: "Withdrawn", color: "bg-zinc-150 text-zinc-700 border-zinc-200 dark:bg-zinc-900/40 dark:text-zinc-400 dark:border-zinc-800" }
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export default function JobTrackerPage() {
  const {
    jobs,
    setJobs,
    loading,
    error,
    fetchJobs,
    addJob,
    updateJobStatus,
    updateJobChecklist,
    removeJob
  } = useJobs()

  const [activeTab, setActiveTab] = useState("kanban") // "kanban" | "calendar" | "analytics" | "list"
  const [searchTerm, setSearchTerm] = useState("")

  // CRM Detail / Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null) // null for create mode
  const [modalData, setModalData] = useState({
    company: "",
    role: "",
    status: "applied",
    salary: "",
    location: "",
    url: "",
    notes: "",
    source: "",
    jobDescription: "",
    recruiterName: "",
    recruiterEmail: "",
    recruiterPhone: "",
    matchScore: 0,
    resumeVersion: "",
    coverLetter: "",
    timeline: [],
    checklist: []
  })

  // Playwright Auto-Apply execution states
  const [automating, setAutomating] = useState(false)
  const [autoMessage, setAutoMessage] = useState("")

  // AI JD Smart Parsing States
  const [showJdExtractor, setShowJdExtractor] = useState(false)
  const [rawJdText, setRawJdText] = useState("")
  const [parsingJd, setParsingJd] = useState(false)
  const [parseError, setParseError] = useState("")

  // Calendar View month configurations
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())

  // New Timeline Event input state
  const [newEvent, setNewEvent] = useState({ title: "", date: "", details: "" })

  // Fetch jobs list on mount
  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const openCreateModal = () => {
    setSelectedJob(null)
    setAutoMessage("")
    setShowJdExtractor(false)
    setRawJdText("")
    setParseError("")
    setModalData({
      company: "",
      role: "",
      status: "applied",
      salary: "",
      location: "",
      url: "",
      notes: "",
      source: "",
      jobDescription: "",
      recruiterName: "",
      recruiterEmail: "",
      recruiterPhone: "",
      matchScore: 0,
      resumeVersion: "",
      coverLetter: "",
      timeline: [],
      checklist: []
    })
    setIsModalOpen(true)
  }

  const handleExtractJd = async () => {
    if (!rawJdText.trim()) {
      setParseError("Please paste some text to extract.")
      return
    }
    setParseError("")
    setParsingJd(true)
    try {
      const result = await api.parseJobDescription(rawJdText)
      
      setModalData(prev => ({
        ...prev,
        company: result.company || prev.company,
        role: result.role || prev.role,
        location: result.location || prev.location,
        salary: result.salary || prev.salary,
        jobDescription: result.jobDescription || rawJdText
      }))
      
      setShowJdExtractor(false)
      setRawJdText("")
    } catch (err) {
      console.error(err)
      setParseError(err.message || "Failed to parse job description. Please fill details manually.")
    } finally {
      setParsingJd(false)
    }
  }

  const openEditModal = (job) => {
    setSelectedJob(job)
    setAutoMessage("")
    setModalData({
      company: job.company || "",
      role: job.role || "",
      status: job.status || "applied",
      salary: job.salary || "",
      location: job.location || "",
      url: job.url || "",
      notes: job.notes || "",
      source: job.source || "",
      jobDescription: job.jobDescription || "",
      recruiterName: job.recruiterName || "",
      recruiterEmail: job.recruiterEmail || "",
      recruiterPhone: job.recruiterPhone || "",
      matchScore: job.matchScore || 0,
      resumeVersion: job.resumeVersion || "",
      coverLetter: job.coverLetter || "",
      timeline: job.timeline ? [...job.timeline] : [],
      checklist: job.checklist ? [...job.checklist] : []
    })
    setIsModalOpen(true)
  }

  const handleModalSave = async (e) => {
    e.preventDefault()
    try {
      if (selectedJob) {
        const updated = await api.updateJob(selectedJob._id, modalData)
        setJobs(prev => prev.map(j => j._id === selectedJob._id ? updated : j))
      } else {
        await addJob(modalData)
      }
      setIsModalOpen(false)
    } catch (err) {
      console.error(err)
    }
  }

  // Kanban HTML5 Drag & Drop controllers
  const [draggedOverColumn, setDraggedOverColumn] = useState(null)

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("jobId", id)
  }

  const handleDragOver = (e, status) => {
    e.preventDefault()
    setDraggedOverColumn(status)
  }

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault()
    setDraggedOverColumn(null)
    const jobId = e.dataTransfer.getData("jobId")
    if (!jobId) return

    try {
      await updateJobStatus(jobId, targetStatus)
    } catch (err) {
      console.error("Failed to update status on drop:", err)
    }
  }

  // Timeline Milestone triggers inside edit modal
  const handleAddTimelineEvent = () => {
    if (!newEvent.title || !newEvent.date) return
    const formattedDate = new Date(newEvent.date)
    setModalData(prev => ({
      ...prev,
      timeline: [...prev.timeline, { ...newEvent, date: formattedDate }]
    }))
    setNewEvent({ title: "", date: "", details: "" })
  }

  const handleRemoveTimelineEvent = (idx) => {
    setModalData(prev => ({
      ...prev,
      timeline: prev.timeline.filter((_, i) => i !== idx)
    }))
  }

  // Calendar render helpers
  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11)
      setCalYear(prev => prev - 1)
    } else {
      setCalMonth(prev => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0)
      setCalYear(prev => prev + 1)
    } else {
      setCalMonth(prev => prev + 1)
    }
  }

  const getCalendarDays = () => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay()
    const cells = []
    for (let i = 0; i < firstDayIndex; i++) cells.push(null)
    for (let i = 1; i <= daysInMonth; i++) cells.push(i)
    return cells
  }

  const getEventsForDay = (day) => {
    if (!day) return []
    const dateQuery = new Date(calYear, calMonth, day)
    const matched = []

    jobs.forEach(job => {
      if (job.timeline && job.timeline.length > 0) {
        job.timeline.forEach(event => {
          const evDate = new Date(event.date)
          if (
            evDate.getFullYear() === dateQuery.getFullYear() &&
            evDate.getMonth() === dateQuery.getMonth() &&
            evDate.getDate() === dateQuery.getDate()
          ) {
            matched.push({ job, event })
          }
        })
      }
    })
    return matched
  }

  // Analytics helper functions
  const getStageCounts = () => {
    const counts = { saved: 0, applied: 0, oa: 0, interview: 0, hr: 0, offer: 0, rejected: 0, withdrawn: 0 }
    jobs.forEach(j => {
      const s = j.status?.toLowerCase()
      if (counts[s] !== undefined) counts[s]++
    })
    return counts
  }

  const getWorkModeSplit = () => {
    let remote = 0, hybrid = 0, onsite = 0
    jobs.forEach(j => {
      const loc = (j.location || "").toLowerCase()
      if (loc.includes("remote")) remote++
      else if (loc.includes("hybrid")) hybrid++
      else if (loc.trim() !== "") onsite++
    })
    return { remote, hybrid, onsite }
  }

  const calculateAverages = () => {
    let sum = 0, count = 0, min = Infinity, max = -Infinity
    jobs.forEach(j => {
      if (!j.salary) return
      const clean = parseInt(j.salary.replace(/[^0-9]/g, ""), 10)
      if (!isNaN(clean) && clean > 0) {
        sum += clean
        count++
        if (clean < min) min = clean
        if (clean > max) max = clean
      }
    })
    return {
      avg: count > 0 ? Math.round(sum / count) : 0,
      min: min !== Infinity ? min : 0,
      max: max !== -Infinity ? max : 0
    }
  }

  const searchFilter = (job) => {
    const q = searchTerm.toLowerCase()
    return (
      job.company.toLowerCase().includes(q) ||
      job.role.toLowerCase().includes(q) ||
      (job.location || "").toLowerCase().includes(q)
    )
  }

  const filteredJobs = jobs.filter(searchFilter)
  const stageCounts = getStageCounts()
  const averages = calculateAverages()
  const workModes = getWorkModeSplit()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 transition-colors duration-300">
      
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-indigo-950 dark:text-white tracking-tight">💼 Career Application CRM</h1>
          <p className="text-gray-550 dark:text-slate-400 mt-1">Manage, optimize, and track job applications, interviews, and outreach metrics.</p>
        </div>
        <Button variant="primary" onClick={openCreateModal} className="px-5 py-3 text-xs font-bold tracking-wide">
          ➕ New Application
        </Button>
      </div>

      {/* Tabs list & Search bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b dark:border-slate-800 pb-4 mb-8">
        <div className="flex gap-2.5 flex-wrap">
          {["kanban", "list", "calendar", "analytics"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === tab
                  ? "bg-indigo-650 text-white shadow"
                  : "text-gray-550 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {tab === "kanban" && "📋 Kanban Board"}
              {tab === "list" && "🗂 List View"}
              {tab === "calendar" && "📅 Calendar"}
              {tab === "analytics" && "📊 Analytics"}
            </button>
          ))}
        </div>

        <div className="w-full md:w-64">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search company, position, or location..."
            className="text-xs"
          />
        </div>
      </div>

      {loading && jobs.length === 0 && (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" message="Loading your application CRM..." />
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-4 rounded-xl text-xs font-semibold mb-6">
          {error}
        </div>
      )}

      {/* VIEW RENDERERS */}
      {!loading && (
        <>
          {/* TAB 1: KANBAN BOARD */}
          {activeTab === "kanban" && (
            <div className="flex gap-4 items-start overflow-x-auto pb-6 scrollbar-thin select-none max-w-full">
              {STATUSES.map(status => {
                const columnJobs = filteredJobs.filter(j => j.status === status)
                const isOver = draggedOverColumn === status

                return (
                  <div
                    key={status}
                    onDragOver={(e) => handleDragOver(e, status)}
                    onDragLeave={() => setDraggedOverColumn(null)}
                    onDrop={(e) => handleDrop(e, status)}
                    className={`rounded-2xl p-4 w-72 flex-shrink-0 border transition duration-200 ${
                      isOver
                        ? "bg-indigo-50/50 border-indigo-300 dark:bg-indigo-950/10 dark:border-indigo-800"
                        : "bg-gray-50/40 border-gray-200 dark:bg-slate-900/40 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3.5 pb-2 border-b dark:border-slate-800">
                      <span className="text-[10px] font-black uppercase text-gray-500 dark:text-slate-400 block tracking-wide">
                        {STATUS_CONFIG[status]?.label}
                      </span>
                      <span className="bg-gray-100 text-gray-700 dark:bg-slate-850 dark:text-slate-300 font-bold text-[10px] px-2 py-0.5 rounded-full">
                        {columnJobs.length}
                      </span>
                    </div>

                    <div className="space-y-3 min-h-[300px]">
                      {columnJobs.map(job => (
                        <div
                          key={job._id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, job._id)}
                          onClick={() => openEditModal(job)}
                          className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-3.5 shadow-xs cursor-pointer hover:border-indigo-400 transition"
                        >
                          <h4 className="text-xs font-black text-gray-900 dark:text-white leading-snug line-clamp-1">{job.role}</h4>
                          <p className="text-[10px] font-bold text-gray-450 dark:text-slate-400 mt-0.5">{job.company}</p>
                          
                          {job.location && (
                            <span className="inline-block text-[9px] font-bold text-gray-400 mt-2 bg-gray-50 dark:bg-slate-950/30 px-1.5 py-0.5 rounded border dark:border-slate-800">
                              📍 {job.location}
                            </span>
                          )}

                          {job.matchScore > 0 && (
                            <span className="inline-block text-[9px] font-black text-indigo-750 dark:text-indigo-400 mt-2 bg-indigo-50/50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30 ml-1.5">
                              🎯 {job.matchScore}% Match
                            </span>
                          )}

                          {job.timeline && job.timeline.length > 0 && (
                            <div className="text-[8px] font-bold text-amber-600 mt-2 bg-amber-50/50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded inline-block ml-1">
                              📅 {job.timeline.length} Events
                            </div>
                          )}
                        </div>
                      ))}
                      {columnJobs.length === 0 && (
                        <div className="text-[10px] text-center text-gray-400 italic py-8">
                          Drop applications here
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* TAB 2: LIST VIEW */}
          {activeTab === "list" && (
            <div className="space-y-4">
              {filteredJobs.map(job => (
                <Card
                  key={job._id}
                  onClick={() => openEditModal(job)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border dark:border-slate-800 hover:border-indigo-400 cursor-pointer transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-xl border ${STATUS_CONFIG[job.status]?.color}`}>
                        {STATUS_CONFIG[job.status]?.label}
                      </span>
                      {job.location && (
                        <span className="text-[10px] font-bold text-gray-400">📍 {job.location}</span>
                      )}
                    </div>
                    <h3 className="text-md font-bold text-indigo-950 dark:text-white">{job.role} at {job.company}</h3>
                    <p className="text-xs text-gray-550 dark:text-slate-400 font-semibold">
                      Expected Salary: <span className="text-gray-800 dark:text-slate-200">{job.salary || "Not Specified"}</span>
                    </p>
                  </div>

                  <div className="flex gap-3 flex-wrap items-center">
                    {job.matchScore > 0 && (
                      <span className="text-xs font-bold text-indigo-650 bg-indigo-50/50 px-3 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                        🎯 {job.matchScore}% Match
                      </span>
                    )}
                    {job.recruiterName && (
                      <span className="text-xs text-slate-550">
                        👤 Recruiter: {job.recruiterName}
                      </span>
                    )}
                    {job.timeline?.length > 0 && (
                      <span className="text-xs text-amber-600 bg-amber-50/50 px-3 py-1 rounded-lg font-bold">
                        📅 {job.timeline.length} Milestones
                      </span>
                    )}
                  </div>
                </Card>
              ))}

              {filteredJobs.length === 0 && (
                <EmptyState
                  icon="📭"
                  title="No CRM profiles match query."
                  description="Use the top button to catalog your target jobs."
                />
              )}
            </div>
          )}

          {/* TAB 3: CALENDAR VIEW */}
          {activeTab === "calendar" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/30 border dark:border-slate-800 rounded-2xl p-4">
                <Button variant="secondary" size="sm" onClick={handlePrevMonth}>
                  ◀ Previous Month
                </Button>
                <h3 className="text-sm font-black text-indigo-950 dark:text-white">
                  {MONTHS[calMonth]} {calYear}
                </h3>
                <Button variant="secondary" size="sm" onClick={handleNextMonth}>
                  Next Month ▶
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="text-gray-400 py-2 border-b dark:border-slate-800">
                    {day}
                  </div>
                ))}

                {getCalendarDays().map((day, idx) => {
                  const dayEvents = getEventsForDay(day)
                  return (
                    <div
                      key={idx}
                      className={`min-h-[90px] border dark:border-slate-850 rounded-xl p-1.5 flex flex-col items-stretch text-left transition ${
                        day ? "bg-white dark:bg-slate-900" : "bg-gray-50/30 dark:bg-slate-955/10 border-dashed"
                      }`}
                    >
                      <span className={`text-[10px] font-bold ${day ? "text-gray-500 dark:text-slate-400" : "text-transparent"}`}>
                        {day || ""}
                      </span>

                      <div className="space-y-1.5 mt-1 overflow-y-auto max-h-[70px]">
                        {dayEvents.map(({ job, event }, i) => (
                          <div
                            key={i}
                            onClick={() => openEditModal(job)}
                            className="bg-indigo-50 text-indigo-950 border border-indigo-150 rounded px-1.5 py-0.5 text-[8px] font-bold truncate cursor-pointer hover:border-indigo-350 transition leading-tight"
                            title={`${job.company} - ${event.title}`}
                          >
                            🏢 {job.company}: {event.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 4: ANALYTICS DASHBOARD */}
          {activeTab === "analytics" && (
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-5 border dark:border-slate-800 md:col-span-2 space-y-4">
                <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wider">Conversion Stages</h3>
                
                <div className="space-y-3.5">
                  {STATUSES.map(status => {
                    const count = stageCounts[status] || 0
                    const percentage = jobs.length > 0 ? (count / jobs.length) * 100 : 0
                    return (
                      <div key={status} className="space-y-1.5 text-xs font-bold">
                        <div className="flex justify-between">
                          <span className="capitalize">{STATUS_CONFIG[status]?.label}</span>
                          <span>{count} ({Math.round(percentage)}%)</span>
                        </div>
                        <div className="h-3 bg-gray-150 dark:bg-slate-850 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-650 dark:bg-indigo-400 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              <div className="space-y-6">
                <Card className="p-5 border dark:border-slate-800 space-y-3">
                  <h3 className="text-sm font-black text-gray-855 dark:text-white uppercase tracking-wider">Salary Statistics</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-center items-center">
                    <div className="p-3 bg-gray-50 dark:bg-slate-950/20 rounded-xl border dark:border-slate-850">
                      <span className="text-[9px] uppercase font-black text-gray-455">Average</span>
                      <p className="text-sm font-black text-indigo-950 dark:text-white mt-0.5">
                        {averages.avg > 0 ? `$${averages.avg.toLocaleString()}` : "$0"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-slate-950/20 rounded-xl border dark:border-slate-850">
                      <span className="text-[9px] uppercase font-black text-gray-455">Max Expected</span>
                      <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {averages.max > 0 ? `$${averages.max.toLocaleString()}` : "$0"}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 border dark:border-slate-800 space-y-4">
                  <h3 className="text-sm font-black text-gray-855 dark:text-white uppercase tracking-wider">Location Mix</h3>
                  
                  <div className="space-y-2.5 text-xs font-bold text-gray-655 dark:text-slate-350">
                    <div className="flex justify-between items-center">
                      <span>Remote</span>
                      <span className="font-extrabold text-indigo-650">{workModes.remote} Jobs</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Hybrid</span>
                      <span className="font-extrabold text-amber-500">{workModes.hybrid} Jobs</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Onsite Office</span>
                      <span className="font-extrabold text-emerald-500">{workModes.onsite} Jobs</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* CRM JOB DETAIL / EDIT OVERLAY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8 animate-scaleIn">
            <div className="flex justify-between items-center border-b dark:border-slate-855 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-indigo-950 dark:text-white">
                  {selectedJob ? "📝 Edit Application Details" : "➕ Catalog New Job Application"}
                </h3>
                <p className="text-xs text-gray-550 dark:text-slate-400">Keep application parameters updated for accurate funnel stats.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl font-bold"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSave} className="space-y-6">
              {/* AI AUTO-EXTRACTOR BLOCK FOR NEW JOBS */}
              {!selectedJob && (
                <div className="border border-indigo-150 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/10 p-4 rounded-2xl space-y-3 mb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">✨</span>
                      <div>
                        <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-400 uppercase tracking-wide">
                          AI Smart JD Autofill
                        </h4>
                        <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                          Paste the raw job description or page details text below to extract fields automatically.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowJdExtractor(!showJdExtractor)}
                      className="text-xs font-extrabold text-indigo-650 dark:text-indigo-400 hover:underline select-none"
                    >
                      {showJdExtractor ? "Hide Panel" : "Show Panel"}
                    </button>
                  </div>

                  {showJdExtractor && (
                    <div className="space-y-3.5 pt-2 border-t dark:border-slate-850 animate-scaleUp">
                      <textarea
                        className="w-full text-xs p-3 rounded-xl border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-28"
                        placeholder="Paste full job details, title, requirements, description, or page text here..."
                        value={rawJdText}
                        onChange={(e) => setRawJdText(e.target.value)}
                      />
                      {parseError && (
                        <p className="text-[10px] text-red-500 font-bold">{parseError}</p>
                      )}
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          className="flex items-center gap-1.5 font-bold shadow-sm"
                          onClick={handleExtractJd}
                          disabled={parsingJd}
                        >
                          {parsingJd ? (
                            <>
                              <LoadingSpinner size="xs" /> Extracting...
                            </>
                          ) : (
                            <>⚡ Extract Details</>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-5">
                <Input
                  label="Role Title"
                  value={modalData.role}
                  onChange={(e) => setModalData(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="e.g. Frontend Engineer"
                  required
                />
                <Input
                  label="Company Name"
                  value={modalData.company}
                  onChange={(e) => setModalData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="e.g. Netflix"
                  required
                />
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Application Status
                  </label>
                  <select
                    value={modalData.status}
                    onChange={(e) => setModalData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{STATUS_CONFIG[s]?.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                <Input
                  label="Expected / Offered Salary"
                  value={modalData.salary}
                  onChange={(e) => setModalData(prev => ({ ...prev, salary: e.target.value }))}
                  placeholder="e.g. $145,000"
                />
                <Input
                  label="Location"
                  value={modalData.location}
                  onChange={(e) => setModalData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Remote / Hybrid"
                />
                <Input
                  label="Listing URL"
                  value={modalData.url}
                  onChange={(e) => setModalData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="Paste URL..."
                />
              </div>

              {/* PLAYWRIGHT AUTO-APPLY CONSOLE PANEL */}
              {selectedJob && modalData.url && (
                <div className="border-t dark:border-slate-855 pt-5 space-y-4 bg-indigo-50/5 dark:bg-slate-950/10 p-5 rounded-2xl border dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-black text-indigo-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        🚀 Playwright Form Auto-Filler
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">Prefill details (name, links, resume upload, AI answers) in a headed browser window.</p>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={async () => {
                        setAutomating(true)
                        setAutoMessage("Launching Playwright Chrome headed browser...")
                        try {
                          const res = await api.automateApply(selectedJob._id)
                          setAutoMessage(res.message || "Automation process finished.")
                          fetchJobs()
                        } catch (err) {
                          setAutoMessage(err.message || "Automation triggered with errors.")
                          fetchJobs()
                        } finally {
                          setAutomating(false)
                        }
                      }}
                      loading={automating}
                      className="text-xs font-bold px-4 py-2.5 bg-indigo-650"
                    >
                      🚀 Open & Prefill Form
                    </Button>
                  </div>

                  {autoMessage && (
                    <div className="bg-indigo-50/40 border border-indigo-100 dark:bg-slate-900/50 dark:border-slate-800 p-3.5 rounded-xl text-xs leading-relaxed text-indigo-955 dark:text-indigo-400 font-semibold border-l-4 border-l-indigo-600">
                      {autoMessage}
                    </div>
                  )}
                </div>
              )}

              <div className="border-t dark:border-slate-855 pt-5 space-y-4">
                <h4 className="text-xs font-black text-indigo-950 dark:text-white uppercase tracking-wider">Recruiter & Outreach Contacts</h4>
                <div className="grid md:grid-cols-3 gap-5">
                  <Input
                    label="Recruiter Name"
                    value={modalData.recruiterName}
                    onChange={(e) => setModalData(prev => ({ ...prev, recruiterName: e.target.value }))}
                    placeholder="Jane Doe"
                  />
                  <Input
                    label="Recruiter Email"
                    value={modalData.recruiterEmail}
                    onChange={(e) => setModalData(prev => ({ ...prev, recruiterEmail: e.target.value }))}
                    placeholder="jane@company.com"
                  />
                  <Input
                    label="Recruiter Phone"
                    value={modalData.recruiterPhone}
                    onChange={(e) => setModalData(prev => ({ ...prev, recruiterPhone: e.target.value }))}
                    placeholder="+1 555 0199"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-5">
                  <Input
                    label="ATS Score Alignment %"
                    type="number"
                    value={modalData.matchScore}
                    onChange={(e) => setModalData(prev => ({ ...prev, matchScore: parseInt(e.target.value) || 0 }))}
                    placeholder="85"
                  />
                  <Input
                    label="Resume Version Used"
                    value={modalData.resumeVersion}
                    onChange={(e) => setModalData(prev => ({ ...prev, resumeVersion: e.target.value }))}
                    placeholder="e.g. Tailored_v1"
                  />
                  <Input
                    label="Cover Letter Draft"
                    value={modalData.coverLetter}
                    onChange={(e) => setModalData(prev => ({ ...prev, coverLetter: e.target.value }))}
                    placeholder="e.g. Enthusiastic_Outreach"
                  />
                </div>
              </div>

              <div className="border-t dark:border-slate-855 pt-5 space-y-4">
                <h4 className="text-xs font-black text-indigo-950 dark:text-white uppercase tracking-wider">Timeline Milestones ({modalData.timeline.length})</h4>
                
                <div className="space-y-2">
                  {modalData.timeline.map((event, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs bg-gray-50 dark:bg-slate-950/20 p-3.5 rounded-xl border dark:border-slate-850">
                      <div>
                        <span className="font-bold text-indigo-950 dark:text-white">{event.title}</span>{" "}
                        <span className="text-gray-400 font-semibold ml-2">{new Date(event.date).toLocaleDateString()}</span>
                        {event.details && <p className="text-gray-500 mt-1">{event.details}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTimelineEvent(idx)}
                        className="text-red-500 hover:underline font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-3 gap-4 items-end bg-gray-50/30 dark:bg-slate-950/10 p-4 border border-dashed dark:border-slate-850 rounded-2xl">
                  <Input
                    label="Event Title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Google Screening Call"
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddTimelineEvent}
                    className="w-full text-xs"
                  >
                    Add Milestone
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <Input
                  label="Job Description details"
                  as="textarea"
                  value={modalData.jobDescription}
                  onChange={(e) => setModalData(prev => ({ ...prev, jobDescription: e.target.value }))}
                  className="h-32 text-xs"
                />
                <Input
                  label="General Notes"
                  as="textarea"
                  value={modalData.notes}
                  onChange={(e) => setModalData(prev => ({ ...prev, notes: e.target.value }))}
                  className="h-32 text-xs"
                />
              </div>

              <div className="flex justify-between items-center border-t dark:border-slate-855 pt-5">
                {selectedJob ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to delete this job?")) {
                        await removeJob(selectedJob._id)
                        setIsModalOpen(false)
                      }
                    }}
                    className="text-xs text-red-500 hover:underline font-bold"
                  >
                    Delete Application
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-3">
                  <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" className="bg-indigo-650">
                    {selectedJob ? "Save Updates" : "Create Application"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
