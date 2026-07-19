import { useState, useCallback } from "react"

/**
 * Custom hook to manage states of async operations.
 * Decouples loading, error, and return states from pages/forms.
 */
export default function useAsync(asyncFunction) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await asyncFunction(...args)
      setData(result)
      return result
    } catch (err) {
      setError(err.message || "An unexpected error occurred.")
      throw err
    } finally {
      setLoading(false)
    }
  }, [asyncFunction])

  return {
    loading,
    error,
    data,
    setData,
    setError,
    execute
  }
}
