import { Link, useLocation, useNavigate } from "react-router-dom"
import { useTheme } from "../context/ThemeContext"

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const token = localStorage.getItem("token")
  const user = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    navigate("/login")
    window.location.reload()
  }

  const linkStyles = (path) => {
    const isActive = pathname === path
    return `text-sm font-bold transition-all duration-200 px-3 py-2 rounded-xl ${
      isActive
        ? "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/30"
        : "text-gray-650 dark:text-slate-350 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-slate-900"
    }`
  }

  return (
    <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 px-6 py-4 mb-8 flex justify-between items-center sticky top-0 z-50 transition-colors duration-300">
      <div className="flex items-center gap-3">
        <span className="text-2xl animate-pulse">📘</span>
        <h2 className="text-xl font-black text-indigo-950 dark:text-white tracking-tight">
          Career Manager
        </h2>
      </div>
      
      <div className="flex items-center gap-4">
        {token && (
          <div className="hidden md:flex gap-2">
            <Link to="/" className={linkStyles("/")}>
              🗂 Job Tracker
            </Link>
            <Link to="/profiles" className={linkStyles("/profiles")}>
              👤 Master Profile
            </Link>
            <Link to="/resume-analyzer" className={linkStyles("/resume-analyzer")}>
              🔍 Resume Analyzer
            </Link>
            <Link to="/prep" className={linkStyles("/prep")}>
              🗣 Interview Prep
            </Link>
          </div>
        )}
        
        <div className="flex items-center gap-4 border-l pl-4 border-gray-200 dark:border-slate-800">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-gray-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-850 transition-all duration-200 active:scale-95"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? (
              <svg className="w-5 h-5 transform rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707-.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {token ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-700 dark:text-slate-300 hidden sm:inline bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border dark:border-slate-700">
                Hi, {user?.name || "User"}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/30 font-bold px-4 py-2 rounded-xl text-xs transition active:scale-95"
              >
                🚪 Log Out
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" className="bg-transparent hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-750 dark:text-slate-200 font-bold px-4 py-2 rounded-xl text-xs transition border border-gray-200 dark:border-slate-800 active:scale-95">
                Sign In
              </Link>
              <Link to="/signup" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm active:scale-95">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
