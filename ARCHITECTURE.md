# Career Manager: System Architecture Guide

Welcome to the **Career Manager** architectural documentation. This guide details the folder layouts, backend patterns, frontend UI components, hooks, and configurations that power this application.

---

## 📂 Codebase Directory Layout

```
├── ARCHITECTURE.md           # This document
├── backend/
│   ├── config/               # DB connection modules
│   ├── controllers/          # HTTP request handlers (separating routes from logic)
│   ├── middleware/           # Authentication guards, upload helpers, global errors
│   ├── models/               # Mongoose database models
│   ├── routes/               # API endpoints declarations
│   ├── services/             # Central ForgeAI & Gemini core integrations
│   ├── utils/                # Environment variables validations
│   ├── server.js             # Express application boot entry
│   └── test-api.js           # Automated integration test suite
│
└── job-tracker-app/
    ├── src/
    │   ├── components/
    │   │   ├── layout/       # Layout structures (Navbar, Header)
    │   │   ├── ui/           # Reusable atomic UI (Button, Input, Card, Modal, Badges, etc.)
    │   │   └── Filterbar.jsx # Features filters
    │   ├── context/          # Global providers (Theme context)
    │   ├── hooks/            # Modular state-management hooks (useAuth, useJobs, useAsync)
    │   ├── pages/            # Route pages (Tracker page, Resume analyzer page, Auth screens)
    │   ├── services/         # Centralized API adapters (Axios-like token wrapper)
    │   ├── App.jsx           # Parent container wrapping paths and base background themes
    │   └── index.css         # Reset styles and transitions
    └── tailwind.config.js    # Styling declarations enabling class-based dark modes
```

---

## 🛠 Backend Architecture (Express)

The backend is refactored into a scalable **Controller-Service-Repository** pattern:

### 1. Route Delegation
Routes in `routes/*.js` only handle URL bindings, HTTP verb mappings, auth guards, and file upload middlewares:
```javascript
// Example from routes/jobs.js
router.get("/", auth, getJobs)
router.post("/", auth, createJob)
```

### 2. Controller Handlers
Controllers in `controllers/*.js` process inbound payloads, trigger DB queries, parse status codes, and call `next(error)` on uncaught exceptions:
```javascript
// Example from controllers/jobController.js
export async function getJobs(req, res, next) {
  try {
    const jobs = await Job.find({ user: req.userId }).sort({ createdAt: -1 })
    res.json(jobs)
  } catch (error) {
    next(error); // Caught by global error handler
  }
}
```

### 3. Centralized Global Error Interception
The `middleware/errorHandler.js` middleware traps thrown exceptions, logging traces in details and returning structured JSON payloads to the client:
```json
{
  "message": "Error details...",
  "stack": "Stack trace (Only in development/test environments)"
}
```

### 4. Startup Validation
The `utils/envValidator.js` asserts the existence of required environment variables (`MONGO_URI`, `JWT_SECRET`, `FORGE_API_KEY`) on startup. If a variable is missing, the application logs a clean warning and shuts down safely instead of failing silently on request.

---

## 🎨 Frontend Architecture (Vite + React)

The frontend uses custom React hooks, a centralized API client, and atomic design tokens to manage views:

### 1. Centralized Request Interceptors
The API client in `src/services/api.js` wraps the standard fetch protocol to:
*   Automatically inject the bearer authorization headers (`Authorization: Bearer <token>`).
*   Catch `401 Unauthorized` responses (expired/invalid sessions), automatically clear credentials from `localStorage`, and redirect the user back to the login screen.
*   Throw clean, parsed error strings from server response bodies.

### 2. Custom Hooks
State logic is decoupled from page components:
*   `useAsync(fn)`: Manages state machinery (`loading`, `error`, `data`, and execution runner) for any generic asynchronous task (like parsing a PDF or triggering an AI review).
*   `useAuth()`: Handles signup, login, session states, and user cache local storage synchronization.
*   `useJobs()`: Performs CRUD modifications on user job list collections, introducing **optimistic updates** for checklist checkmarks and status changes so the interface feels lightning-fast.

### 3. Reusable UI Components
All input fields, buttons, container blocks, badges, empty states, files drag-and-drop zones, and loading indicators use reusable modules in `src/components/ui/`.

---

## 🌙 Dark/Light Theme Support
*   **Tailwind Integration**: Enabled class-based dark mode (`darkMode: "class"`).
*   **Central Provider**: `ThemeContext.jsx` manages the active theme state, writes choice persistence to `localStorage`, and adds/removes the `"dark"` class on `document.documentElement` dynamically.
*   **FOUC Prevention**: Injected an inline script block into `index.html`'s `<head>` to evaluate the user's preferred theme instantly on page boot *before* the React bundle parses, eliminating screen flashing.
