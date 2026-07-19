import React from "react"

export default function Badge({
  status = "applied",
  className = "",
  ...props
}) {
  const statusColors = {
    saved: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    applied: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50",
    screening: "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50",
    interview: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
    offer: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
    rejected: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50",
    withdrawn: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
  }

  const baseStyles = "px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize"

  return (
    <span
      className={`${baseStyles} ${statusColors[status.toLowerCase()] || statusColors.applied} ${className}`}
      {...props}
    >
      {status}
    </span>
  )
}
