import { useState } from "react"
import Input from "./ui/Input"
import Button from "./ui/Button"

export default function JobForm({ addJob }) {
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [status, setStatus] = useState("applied")
  const [salary, setSalary] = useState("")
  const [location, setLocation] = useState("")
  const [url, setUrl] = useState("")
  const [source, setSource] = useState("")
  const [notes, setNotes] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [appliedDate, setAppliedDate] = useState(() => new Date().toISOString().split("T")[0])
  
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!company || !role) return

    const newJob = {
      company,
      role,
      status,
      salary,
      location,
      url,
      source,
      notes,
      jobDescription,
      appliedDate: new Date(appliedDate).toISOString()
    }

    addJob(newJob)
    
    // Reset form
    setCompany("")
    setRole("")
    setStatus("applied")
    setSalary("")
    setLocation("")
    setUrl("")
    setSource("")
    setNotes("")
    setJobDescription("")
    setAppliedDate(new Date().toISOString().split("T")[0])
    setShowAdvanced(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800/80 rounded-2xl max-w-5xl mx-auto w-full px-6 py-6 shadow-sm mb-8 transition-all duration-300"
    >
      <div className="flex justify-between items-center mb-5 border-b border-gray-150 dark:border-slate-800 pb-3">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
          ➕ Track New Application
        </h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? "Hide Details ⬆" : "Show More Details ⬇"}
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Input
          label="Company *"
          id="company"
          placeholder="e.g. Google"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
        />

        <Input
          label="Role *"
          id="role"
          placeholder="e.g. Frontend Developer"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        />

        <Input
          label="Status"
          id="status"
          as="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="saved">saved</option>
          <option value="applied">applied</option>
          <option value="screening">screening</option>
          <option value="interview">interview</option>
          <option value="offer">offer</option>
          <option value="rejected">rejected</option>
          <option value="withdrawn">withdrawn</option>
        </Input>
      </div>

      {/* Collapsible Advanced section with smooth max-height animation */}
      <div className={`transition-all duration-300 overflow-hidden ${showAdvanced ? "max-h-[800px] mt-5 opacity-100" : "max-h-0 opacity-0 pointer-events-none"}`}>
        <div className="grid gap-5 md:grid-cols-3 border-t border-gray-100 dark:border-slate-800 pt-5">
          <Input
            label="Salary"
            id="salary"
            placeholder="e.g. $120,000 / yr"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
          />

          <Input
            label="Location"
            id="location"
            placeholder="e.g. New York, NY (Hybrid)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <Input
            label="Application Date"
            id="appliedDate"
            type="date"
            value={appliedDate}
            onChange={(e) => setAppliedDate(e.target.value)}
          />

          <Input
            label="Job URL"
            id="url"
            type="url"
            placeholder="https://company.com/jobs/123"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />

          <Input
            label="Source"
            id="source"
            placeholder="e.g. LinkedIn, Referral"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />

          <div className="md:col-span-3">
            <Input
              label="Notes / Reminders"
              id="notes"
              as="textarea"
              placeholder="Resume version used, interviewer names, specific details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20"
            />
          </div>

          <div className="md:col-span-3">
            <Input
              label="Job Description (for AI Tools)"
              id="jobDescription"
              as="textarea"
              placeholder="Paste the full job requirements / description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="h-32"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button type="submit" variant="primary">
          ➕ Add Application
        </Button>
      </div>
    </form>
  )
}
