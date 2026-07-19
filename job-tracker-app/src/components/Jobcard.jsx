import { useState } from "react"
import { api } from "../services/api"
import Card from "./ui/Card"
import Button from "./ui/Button"
import Badge from "./ui/Badge"
import Modal from "./ui/Modal"
import Input from "./ui/Input"

export default function JobCard({ job, onDelete, onUpdateStatus, onUpdateChecklist }) {
  const [showDetails, setShowDetails] = useState(false)
  const [newChecklistItem, setNewChecklistItem] = useState("")
  
  // AI generation states
  const [generatingPrep, setGeneratingPrep] = useState(false)
  const [generatingAssist, setGeneratingAssist] = useState(false)
  const [aiModal, setAiModal] = useState({ show: false, title: "", content: "" })
  const [copySuccess, setCopySuccess] = useState(false)

  const handleStatusChange = (e) => {
    onUpdateStatus(job._id, e.target.value)
  }

  // Checklist Handlers
  const handleAddChecklistItem = async (e) => {
    e.preventDefault()
    if (!newChecklistItem.trim()) return

    const newItem = { text: newChecklistItem.trim(), done: false }
    const updatedChecklist = [...(job.checklist || []), newItem]

    // Optimistic Update
    onUpdateChecklist(job._id, updatedChecklist)
    setNewChecklistItem("")

    try {
      await api.updateChecklist(job._id, updatedChecklist)
    } catch (err) {
      console.error("Checklist add error, rolling back:", err)
      // Rollback on failure
      onUpdateChecklist(job._id, job.checklist)
    }
  }

  const handleToggleChecklist = async (itemId) => {
    const updatedChecklist = job.checklist.map(item =>
      item._id === itemId ? { ...item, done: !item.done } : item
    )

    // Optimistic Update
    onUpdateChecklist(job._id, updatedChecklist)

    try {
      await api.updateChecklist(job._id, updatedChecklist)
    } catch (err) {
      console.error("Checklist toggle error, rolling back:", err)
      onUpdateChecklist(job._id, job.checklist)
    }
  }

  const handleDeleteChecklist = async (itemId) => {
    const updatedChecklist = job.checklist.filter(item => item._id !== itemId)

    // Optimistic Update
    onUpdateChecklist(job._id, updatedChecklist)

    try {
      await api.updateChecklist(job._id, updatedChecklist)
    } catch (err) {
      console.error("Checklist delete error, rolling back:", err)
      onUpdateChecklist(job._id, job.checklist)
    }
  }

  // AI Handler: Outreach & Interview Prep
  const handleGeneratePrep = async () => {
    setGeneratingPrep(true)
    try {
      const data = await api.generatePrep(job._id)
      setAiModal({
        show: true,
        title: `✨ Interview Prep & Outreach: ${job.company}`,
        content: data.result
      })
    } catch (err) {
      alert(err.message || "Failed to generate interview preparation material. Make sure your GEMINI_API_KEY is configured.")
    } finally {
      setGeneratingPrep(false)
    }
  }

  // AI Handler: Apply Assist (Cover Letter & Why This Company)
  const handleApplyAssist = async () => {
    setGeneratingAssist(true)
    try {
      const data = await api.generateApplyAssist(job._id)
      setAiModal({
        show: true,
        title: `📝 Apply Assist: ${job.role} at ${job.company}`,
        content: data.result
      })
    } catch (err) {
      alert(err.message || "Failed to generate application assistance material. Make sure you have uploaded your resume.")
    } finally {
      setGeneratingAssist(false)
    }
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(aiModal.content)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  // Simple Markdown to HTML Formatter (Regex-based) for modal presentation
  const renderMarkdown = (text) => {
    if (!text) return ""
    let formatted = text
      // Headers
      .replace(/^### (.*$)/gim, '<h4 class="text-sm font-bold text-slate-800 dark:text-slate-100 mt-4 mb-2">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 class="text-md font-extrabold text-indigo-900 dark:text-indigo-400 mt-5 mb-2 border-b dark:border-slate-850 pb-1">$1</h3>')
      .replace(/^# (.*$)/gim, '<h2 class="text-lg font-black text-indigo-950 dark:text-white mt-6 mb-3">$1</h2>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
      // Lists
      .replace(/^\s*\-\s*(.*$)/gim, '<li class="ml-4 list-disc text-slate-700 dark:text-slate-300 mb-1">$1</li>')
      .replace(/^\s*\d\.\s*(.*$)/gim, '<li class="ml-4 list-decimal text-slate-700 dark:text-slate-300 mb-1">$1</li>')
      // Linebreaks
      .replace(/\n/g, "<br />")

    return <div dangerouslySetInnerHTML={{ __html: formatted }} className="text-sm leading-relaxed text-slate-750 dark:text-slate-300 space-y-1" />
  }

  return (
    <Card className="overflow-hidden" hoverable>
      {/* Primary Card View */}
      <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">📌 {job.company}</h2>
            <Badge status={job.status} />
          </div>
          <p className="text-gray-600 dark:text-slate-400 text-sm font-semibold">{job.role}</p>
          
          {/* Quick info snippet */}
          <div className="flex gap-4 text-xs text-gray-400 dark:text-slate-500 mt-2 flex-wrap">
            {job.location && <span>📍 {job.location}</span>}
            {job.salary && <span>💰 {job.salary}</span>}
            {job.appliedDate && (
              <span>📅 Applied: {new Date(job.appliedDate).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status selector */}
          <select
            className="border border-gray-200 dark:border-slate-800 p-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 capitalize"
            value={job.status}
            onChange={handleStatusChange}
          >
            <option value="saved">saved</option>
            <option value="applied">applied</option>
            <option value="screening">screening</option>
            <option value="interview">interview</option>
            <option value="offer">offer</option>
            <option value="rejected">rejected</option>
            <option value="withdrawn">withdrawn</option>
          </select>

          {/* Details Toggle */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Hide Info" : "Details"}
          </Button>

          {/* Delete Button */}
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete(job._id)}
          >
            ❌ Delete
          </Button>
        </div>
      </div>

      {/* Expanded Details / Sub-Panels */}
      {showDetails && (
        <div className="bg-gray-50/50 dark:bg-slate-950/20 border-t border-gray-150 dark:border-slate-800 p-5 space-y-6 animate-fadeIn">
          {/* Job Details Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Job Details</h3>
              <div className="space-y-2.5 text-sm text-slate-700 dark:text-slate-350">
                {job.url && (
                  <p>
                    <strong className="text-gray-500 dark:text-slate-400 font-semibold">Link:</strong>{" "}
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                      View Job Listing ↗
                    </a>
                  </p>
                )}
                {job.source && (
                  <p>
                    <strong className="text-gray-500 dark:text-slate-400 font-semibold">Source:</strong>{" "}
                    <span className="text-slate-750 dark:text-slate-300">{job.source}</span>
                  </p>
                )}
                {job.notes && (
                  <div>
                    <strong className="text-gray-500 dark:text-slate-400 font-semibold block mb-1">Notes:</strong>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 text-xs text-gray-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                      {job.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Checklist Component */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Application Tasks</h3>
              
              <form onSubmit={handleAddChecklistItem} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    placeholder="Add task (e.g. Mock interview)"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    className="p-1"
                  />
                </div>
                <Button type="submit" variant="primary" size="md" className="py-3">
                  Add
                </Button>
              </form>

              <div className="space-y-2 max-h-40 overflow-y-auto pt-1 scrollbar-thin">
                {job.checklist && job.checklist.length > 0 ? (
                  job.checklist.map((item) => (
                    <div key={item._id || item.text} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-gray-200 dark:border-slate-800 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => handleToggleChecklist(item._id)}
                          className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-950"
                        />
                        <span className={item.done ? "line-through text-gray-450 dark:text-slate-500" : "text-gray-700 dark:text-slate-300 font-semibold"}>
                          {item.text}
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteChecklist(item._id)}
                        className="text-gray-400 hover:text-red-500 transition px-1"
                      >
                        ❌
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-450 dark:text-slate-500 italic">No tasks added for this application.</p>
                )}
              </div>
            </div>
          </div>

          {/* AI Tools Bar */}
          <div className="border-t border-gray-150 dark:border-slate-800 pt-4 flex flex-wrap gap-3 items-center">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-400 flex items-center gap-1">
              ✨ Gemini AI:
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGeneratePrep}
              loading={generatingPrep}
            >
              🎯 Prep & Outreach
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApplyAssist}
              loading={generatingAssist}
            >
              📝 Apply Assist
            </Button>
          </div>
        </div>
      )}

      {/* AI Result Presentation Modal */}
      <Modal
        show={aiModal.show}
        onClose={() => setAiModal({ ...aiModal, show: false })}
        title={aiModal.title}
        footer={
          <>
            <Button variant="primary" size="sm" onClick={handleCopyToClipboard}>
              {copySuccess ? "Copied! ✓" : "Copy to Clipboard"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setAiModal({ ...aiModal, show: false })}>
              Close
            </Button>
          </>
        }
      >
        <div className="font-mono text-xs whitespace-pre-wrap select-all">
          {renderMarkdown(aiModal.content)}
        </div>
      </Modal>
    </Card>
  )
}
