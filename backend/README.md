# CareerOS API Server (Express + Node.js)

This directory contains the Express-based API server for the **CareerOS** application, integrated with MongoDB (Mongoose), Puppeteer (PDF rendering), and Zod schema validations.

For a complete walkthrough of the program architecture, visual screenshots, AI models, and setup guides, please refer to the main [Root Workspace README](../README.md).

## 📂 Folder Layout

*   `config/` — Database connection configuration
*   `controllers/` — HTTP request handlers and controller logic
*   `middleware/` — Security guards, CORS handlers, and file upload validation rules
*   `models/` — MongoDB Mongoose schemas
*   `routes/` — Express route definitions mapping HTTP endpoints
*   `services/` — Core integrations (AI Orchestration services, PDF/DOCX HTML renderers)
*   `templates/` — Resume schemas (Zod) and layout template functions
*   `utils/` — Core utility helpers (Environment validator)

## 🚀 Running the API Server

Ensure you have created and configured your local `.env` file containing database connections and API keys, and installed the node packages:
```bash
npm install
```

Start the API development server (which uses nodemon for auto-reload):
```bash
npm run dev
```
