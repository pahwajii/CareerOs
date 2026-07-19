import React from "react"

/**
 * Reusable Loading Spinner Component.
 * Supports size scaling and custom subtitle descriptions.
 */
export default function LoadingSpinner({
  size = "md",
  message = "Loading...",
  className = ""
}) {
  const sizes = {
    sm: "w-5 h-5 border-2",
    md: "w-10 h-10 border-3",
    lg: "w-16 h-16 border-4"
  }

  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center space-y-4 ${className}`}>
      <span
        className={`animate-spin inline-block border-indigo-650 border-t-transparent rounded-full ${sizes[size]}`}
      />
      {message && (
        <p className="text-xs font-bold text-gray-500 dark:text-slate-400">
          {message}
        </p>
      )}
    </div>
  )
}
