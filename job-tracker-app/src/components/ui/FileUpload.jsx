import React, { useRef, useState } from "react"
import Button from "./Button"

/**
 * Reusable Drag and Drop File Upload Component.
 * Supports file size checks, type limits, upload indicators, and styling.
 */
export default function FileUpload({
  onFileSelect,
  uploading = false,
  accept = ".pdf",
  maxSizeMB = 5,
  helperText = "Click to select or drag PDF file here (Max 5MB)"
}) {
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState("")
  const [error, setError] = useState("")
  const inputRef = useRef(null)

  const validateFile = (file) => {
    setError("")
    if (!file) return false

    // Type check
    const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase()
    if (accept && !accept.split(",").some(ext => ext.trim().toLowerCase() === extension)) {
      setError(`Invalid file type. Only ${accept} files are supported.`)
      return false
    }

    // Size check
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File is too large. Maximum allowed size is ${maxSizeMB}MB.`)
      return false
    }

    setFileName(file.name)
    return true
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (validateFile(droppedFile)) {
        onFileSelect(droppedFile)
      }
    }
  }

  const handleSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (validateFile(selectedFile)) {
        onFileSelect(selectedFile)
      }
    }
  }

  const clearFile = () => {
    setFileName("")
    setError("")
    onFileSelect(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="space-y-3 w-full">
      <div
        className={`relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition duration-200 ${
          dragActive
            ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20"
            : "border-gray-300 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30 hover:bg-gray-50 dark:hover:bg-slate-900/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleSelect}
        />

        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
          <span className="text-3xl mb-2 block">📤</span>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {fileName ? (
              <span className="text-indigo-600 dark:text-indigo-400 font-bold block truncate max-w-[280px]">
                {fileName}
              </span>
            ) : (
              <span>{helperText}</span>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-2.5 rounded-lg text-xs font-bold border-l-4 border-red-500">
          {error}
        </div>
      )}

      {fileName && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={clearFile} disabled={uploading}>
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
