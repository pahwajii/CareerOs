import React from "react"
import Button from "./Button"

export default function EmptyState({
  icon = "📭",
  title = "No data found",
  description = "Get started by adding some records.",
  actionText = "",
  onAction,
  className = ""
}) {
  return (
    <div className={`text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 dark:border-slate-800 ${className}`}>
      <span className="text-4xl block mb-3 animate-bounce" role="img" aria-label="empty state">
        {icon}
      </span>
      <h3 className="text-gray-900 dark:text-slate-100 font-bold text-sm mt-3 uppercase tracking-wider">
        {title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  )
}
