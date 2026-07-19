import React from "react"

export default function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  onClick,
  className = "",
  ...props
}) {
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transform active:scale-[0.98]"
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-indigo-500/10 focus:ring-indigo-500 dark:focus:ring-offset-slate-950",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 focus:ring-slate-500 dark:focus:ring-offset-slate-950",
    outline: "bg-transparent border border-gray-300 hover:bg-gray-50 text-gray-700 dark:border-slate-700 dark:hover:bg-slate-900 dark:text-slate-350 focus:ring-slate-500 dark:focus:ring-offset-slate-950",
    ghost: "bg-transparent hover:bg-gray-50 text-gray-700 dark:hover:bg-slate-900 dark:text-slate-350 focus:ring-slate-500 dark:focus:ring-offset-slate-950",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-red-500/10 focus:ring-red-500 dark:focus:ring-offset-slate-950"
  }

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  }

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  )
}
