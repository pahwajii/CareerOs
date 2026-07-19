import React, { useEffect } from "react"

export default function Modal({
  show = false,
  onClose,
  title = "",
  children,
  footer,
  className = ""
}) {
  // Prevent background scroll when modal is open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [show])

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose()
    }
    if (show) {
      window.addEventListener("keydown", handleEscape)
    }
    return () => window.removeEventListener("keydown", handleEscape)
  }, [show, onClose])

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      {/* Modal Card */}
      <div 
        className={`bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col max-h-[85vh] animate-scaleUp z-10 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-150 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50 rounded-t-2xl">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 text-xl font-bold p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            ✕
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 text-sm text-slate-700 dark:text-slate-200">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-gray-150 dark:border-slate-800 flex justify-end gap-3 bg-gray-50 dark:bg-slate-900/50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
