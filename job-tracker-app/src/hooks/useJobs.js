import { useState, useCallback } from "react"
import { api } from "../services/api"

/**
 * Custom hook to isolate and manage CRUD jobs lists, status selections, and task checklists.
 */
export default function useJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getJobs()
      setJobs(data)
      return data
    } catch (err) {
      setError(err.message || "Failed to load applications list.")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const addJob = useCallback(async (jobData) => {
    try {
      const newJob = await api.createJob(jobData)
      setJobs((prevJobs) => [newJob, ...prevJobs])
      return newJob
    } catch (err) {
      console.error("Create application error:", err)
      throw err
    }
  }, [])

  const updateJobStatus = useCallback(async (jobId, newStatus) => {
    // Optimistic Update
    setJobs((prevJobs) =>
      prevJobs.map((j) => (j._id === jobId ? { ...j, status: newStatus } : j))
    )

    try {
      const updated = await api.updateJob(jobId, { status: newStatus })
      setJobs((prevJobs) =>
        prevJobs.map((j) => (j._id === jobId ? updated : j))
      )
      return updated
    } catch (err) {
      console.error("Status modification failed, reloading lists:", err)
      fetchJobs() // Refetch lists on fail to resolve out-of-sync states
      throw err
    }
  }, [fetchJobs])

  const updateJobChecklist = useCallback(async (jobId, newChecklist) => {
    // Optimistic Update
    setJobs((prevJobs) =>
      prevJobs.map((j) => (j._id === jobId ? { ...j, checklist: newChecklist } : j))
    )

    try {
      await api.updateChecklist(jobId, newChecklist)
    } catch (err) {
      console.error("Checklist sync failed, rolling back states:", err)
      fetchJobs()
      throw err
    }
  }, [fetchJobs])

  const removeJob = useCallback(async (jobId) => {
    try {
      await api.deleteJob(jobId)
      setJobs((prevJobs) => prevJobs.filter((j) => j._id !== jobId))
    } catch (err) {
      console.error("Delete application error:", err)
      throw err
    }
  }, [])

  return {
    jobs,
    setJobs,
    loading,
    error,
    fetchJobs,
    addJob,
    updateJobStatus,
    updateJobChecklist,
    removeJob
  }
}
