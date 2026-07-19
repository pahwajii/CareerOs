import React from "react"

export default function Card({
  children,
  className = "",
  hoverable = false,
  ...props
}) {
  const baseStyles = "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xs"
  const hoverStyles = hoverable ? "hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700 transition-all duration-300" : ""

  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`} {...props}>
      {children}
    </div>
  )
}
