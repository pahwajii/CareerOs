import React, { Suspense, lazy } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Navbar from "./components/Navbar"
import LoadingSpinner from "./components/ui/LoadingSpinner"

// Lazy load pages for optimized production chunking
const JobTrackerPage = lazy(() => import("./pages/JobTrackerPage"))
const ProfilePage = lazy(() => import("./pages/ProfilePage"))
const Login = lazy(() => import("./pages/Login"))
const Signup = lazy(() => import("./pages/Signup"))
const ResumeAnalyzerPage = lazy(() => import("./pages/ResumeAnalyzerPage"))
const InterviewPrepPage = lazy(() => import("./pages/InterviewPrepPage"))

// Simple Auth Guard
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token")
  return token ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <div className="bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-300 ease-in-out">
      <Router>
        <Navbar />
        {/* Wrap lazy routes in Suspense boundary */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <LoadingSpinner size="lg" message="Loading page assets..." />
            </div>
          }
        >
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <JobTrackerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profiles"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resume-analyzer"
              element={
                <ProtectedRoute>
                  <ResumeAnalyzerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prep"
              element={
                <ProtectedRoute>
                  <InterviewPrepPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </div>
  )
}

export default App
