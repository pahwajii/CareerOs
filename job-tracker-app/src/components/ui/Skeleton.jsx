import React from "react"

export default function Skeleton({
  className = "",
  variant = "text", // "text" | "circular" | "rectangular"
  ...props
}) {
  const baseStyles = "bg-gray-200 dark:bg-slate-800 animate-pulse"
  
  const variants = {
    text: "h-3 w-full rounded-sm",
    circular: "rounded-full",
    rectangular: "rounded-xl"
  }

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
