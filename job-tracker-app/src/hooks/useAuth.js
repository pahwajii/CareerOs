import { useState, useCallback } from "react"
import { api } from "../services/api"

/**
 * Custom hook to isolate and manage user authorization sessions.
 */
export default function useAuth() {
  const [token, setTokenState] = useState(() => localStorage.getItem("token"))
  const [user, setUserState] = useState(() => {
    const cached = localStorage.getItem("user")
    return cached ? JSON.parse(cached) : null
  })

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password)
    localStorage.setItem("token", data.token)
    localStorage.setItem("user", JSON.stringify(data.user))
    setTokenState(data.token)
    setUserState(data.user)
    return data
  }, [])

  const signup = useCallback(async (name, email, password) => {
    const data = await api.signup(name, email, password)
    localStorage.setItem("token", data.token)
    localStorage.setItem("user", JSON.stringify(data.user))
    setTokenState(data.token)
    setUserState(data.user)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setTokenState(null)
    setUserState(null)
  }, [])

  const updateUserCache = useCallback((updatedFields) => {
    setUserState((prevUser) => {
      if (!prevUser) return null
      const updated = { ...prevUser, ...updatedFields }
      localStorage.setItem("user", JSON.stringify(updated))
      return updated
    })
  }, [])

  return {
    isAuthenticated: !!token,
    token,
    user,
    login,
    signup,
    logout,
    updateUserCache
  }
}
