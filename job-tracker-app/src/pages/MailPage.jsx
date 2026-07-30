import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { api } from "../services/api"
import useAsync from "../hooks/useAsync"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import LoadingSpinner from "../components/ui/LoadingSpinner"

const DEFAULT_QUERY = 'newer_than:180d (application OR interview OR recruiter OR hiring OR "next steps" OR "thank you for applying")'

export default function MailPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState(null)
  const [jobs, setJobs] = useState([])
  const [emails, setEmails] = useState([])
  const [selectedJobId, setSelectedJobId] = useState("")
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [to, setTo] = useState("")
  const [tone, setTone] = useState("warm professional")
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [confirmSend, setConfirmSend] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })

  const statusAsync = useAsync(api.getGmailStatus)
  const connectAsync = useAsync(api.getGmailConnectUrl)
  const disconnectAsync = useAsync(api.disconnectGmail)
  const messagesAsync = useAsync(api.getGmailMessages)
  const draftAsync = useAsync(api.createGmailDraft)
  const sendAsync = useAsync(api.sendGmailEmail)

  const selectedJob = useMemo(
    () => jobs.find(job => job._id === selectedJobId),
    [jobs, selectedJobId]
  )

  useEffect(() => {
    const loadMail = async () => {
      try {
        const [gmailStatus, jobList] = await Promise.all([
          statusAsync.execute(),
          api.getJobs()
        ])
        setStatus(gmailStatus)
        setJobs(jobList || [])
        if (jobList?.length) {
          setSelectedJobId(jobList[0]._id)
          setTo(jobList[0].recruiterEmail || "")
        }
      } catch (err) {
        setMessage({ text: err.message || "Failed to load MAIL.", type: "error" })
      }
    }

    loadMail()
  }, [])

  useEffect(() => {
    const gmailState = searchParams.get("gmail")
    if (gmailState === "connected") {
      setMessage({ text: "Gmail connected.", type: "success" })
    } else if (gmailState === "error") {
      setMessage({ text: searchParams.get("message") || "Gmail connection failed.", type: "error" })
    }
  }, [searchParams])

  const showMessage = (text, type = "success") => {
    setMessage({ text, type })
  }

  const handleConnect = async () => {
    try {
      const data = await connectAsync.execute()
      window.location.href = data.url
    } catch (err) {
      showMessage(err.message || "Failed to start Gmail connection.", "error")
    }
  }

  const handleDisconnect = async () => {
    try {
      const data = await disconnectAsync.execute()
      setStatus(data)
      setEmails([])
      showMessage("Gmail disconnected.", "success")
    } catch (err) {
      showMessage(err.message || "Failed to disconnect Gmail.", "error")
    }
  }

  const handleLoadEmails = async () => {
    try {
      const data = await messagesAsync.execute({ query, maxResults: 20 })
      setEmails(data.messages || [])
      setStatus(prev => prev ? { ...prev, lastSyncedAt: new Date().toISOString() } : prev)
      showMessage(`Loaded ${data.messages?.length || 0} Gmail messages.`, "success")
    } catch (err) {
      showMessage(err.message || "Failed to load Gmail messages.", "error")
    }
  }

  const handleJobChange = (jobId) => {
    setSelectedJobId(jobId)
    const job = jobs.find(item => item._id === jobId)
    setTo(job?.recruiterEmail || "")
    setSubject("")
    setContent("")
    setConfirmSend(false)
  }

  const getMailPayload = () => ({
    jobId: selectedJobId,
    to,
    subject,
    content,
    tone
  })

  const handleCreateDraft = async () => {
    try {
      const data = await draftAsync.execute(getMailPayload())
      setSubject(data.subject || "")
      setContent(data.content || "")
      showMessage(`Draft created in Gmail: ${data.draftId}`, "success")
    } catch (err) {
      showMessage(err.message || "Failed to create Gmail draft.", "error")
    }
  }

  const handleSend = async () => {
    try {
      const data = await sendAsync.execute({ ...getMailPayload(), confirm: confirmSend })
      setSubject(data.subject || "")
      setContent(data.content || "")
      setConfirmSend(false)
      showMessage(`Email sent: ${data.messageId}`, "success")
    } catch (err) {
      showMessage(err.message || "Failed to send Gmail email.", "error")
    }
  }

  if (statusAsync.loading && !status) {
    return <LoadingSpinner size="lg" message="Loading MAIL..." className="min-h-[50vh]" />
  }

  const connected = Boolean(status?.connected)
  const configured = Boolean(status?.configured)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">MAIL</p>
          <h1 className="text-3xl font-black text-indigo-950 dark:text-white mt-1">Gmail Outreach</h1>
        </div>
        <div className="flex gap-2">
          {connected ? (
            <Button variant="outline" onClick={handleDisconnect} loading={disconnectAsync.loading}>
              Disconnect Gmail
            </Button>
          ) : (
            <Button onClick={handleConnect} loading={connectAsync.loading} disabled={!configured}>
              Connect Gmail
            </Button>
          )}
        </div>
      </div>

      {message.text && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
          message.type === "error"
            ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
            : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <section className="space-y-6">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Connection</h2>
                <p className="text-sm text-gray-550 dark:text-slate-400 mt-2">
                  {connected ? status.email : configured ? "Not connected" : "Google OAuth env missing"}
                </p>
              </div>
              <span className={`text-xs font-black px-3 py-1 rounded-full ${
                connected
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
              }`}>
                {connected ? "CONNECTED" : "OFFLINE"}
              </span>
            </div>
            {status?.lastSyncedAt && (
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-4">
                Last sync: {new Date(status.lastSyncedAt).toLocaleString()}
              </p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Job Emails</h2>
              <Button size="sm" variant="secondary" onClick={handleLoadEmails} loading={messagesAsync.loading} disabled={!connected}>
                Parse Gmail
              </Button>
            </div>
            <Input
              label="Gmail Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mb-4"
            />
            <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
              {emails.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-500">No Gmail messages loaded.</p>
              ) : emails.map(email => (
                <div key={email.id} className="border border-gray-200 dark:border-slate-800 rounded-xl p-4 bg-gray-50 dark:bg-slate-950">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate">{email.subject || "No subject"}</p>
                      <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 truncate">{email.from}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setTo(email.fromEmail)}>
                      Use
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-3 line-clamp-3">{email.snippet}</p>
                  {email.date && (
                    <p className="text-[11px] text-gray-400 dark:text-slate-600 mt-3">{email.date}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section>
          <Card className="p-5">
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">Company Mail</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider">
                  Job
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => handleJobChange(e.target.value)}
                  className="w-full p-3 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {jobs.length === 0 ? (
                    <option value="">No jobs</option>
                  ) : jobs.map(job => (
                    <option key={job._id} value={job._id}>
                      {job.company} - {job.role}
                    </option>
                  ))}
                </select>
              </div>
              <Input label="To" value={to} onChange={(e) => setTo(e.target.value)} placeholder="recruiter@company.com" />
              <Input label="Tone" value={tone} onChange={(e) => setTone(e.target.value)} />
              <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Generated if blank" />
            </div>

            {selectedJob && (
              <div className="mt-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 p-4">
                <p className="text-sm font-black text-indigo-950 dark:text-indigo-300">{selectedJob.company}</p>
                <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">{selectedJob.role}</p>
                {selectedJob.recruiterEmail && (
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">{selectedJob.recruiterEmail}</p>
                )}
              </div>
            )}

            <Input
              as="textarea"
              label="Email Body"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Generated if blank"
              rows={14}
              className="mt-4"
            />

            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={confirmSend}
                  onChange={(e) => setConfirmSend(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Confirm send
              </label>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={handleCreateDraft} loading={draftAsync.loading} disabled={!connected || !selectedJobId || !to}>
                  Create Draft
                </Button>
                <Button onClick={handleSend} loading={sendAsync.loading} disabled={!connected || !selectedJobId || !to || !confirmSend}>
                  Send Email
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
