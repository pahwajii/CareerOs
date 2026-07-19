import React, { useId } from "react"

export default function Input({
  label = "",
  error = "",
  as = "input",
  className = "",
  id,
  ...props
}) {
  const generatedId = useId()
  const activeId = id || generatedId
  
  const baseStyles = "w-full p-3 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all duration-200"
  
  const errorStyles = error ? "border-red-500 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-500" : ""

  const Component = as

  return (
    <div className={`flex flex-col w-full ${className}`}>
      {label && (
        <label htmlFor={activeId} className="text-xs font-bold text-gray-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <Component
        id={activeId}
        className={`${baseStyles} ${errorStyles}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">
          {error}
        </span>
      )}
    </div>
  )
}
