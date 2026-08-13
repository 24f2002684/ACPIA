# ACPIA - Full-Stack Application

ACPIA is a full-stack project built with a FastAPI (Python 3.11+) backend and a Next.js 14 (TypeScript, Tailwind CSS, shadcn/ui) frontend.

## 📁 Repository Structure

```
acpia/
├── backend/
│   ├── main.py                  # FastAPI server with CORS & health endpoint
│   ├── requirements.txt         # FastAPI, Uvicorn, Python-Dotenv, Pydantic
│   ├── .env                     # Backend environment configuration
│   └── .venv/                   # Python virtual environment
└── frontend/
    ├── app/
    │   ├── globals.css          # Dark forest-green color tokens & styles
    │   ├── layout.tsx           # App layout with metadata & hydration safety
    │   └── page.tsx             # Interactive dashboard & GET /api/health client
    ├── tailwind.config.ts       # Design system (#1A3A2A background, #97BC62 accent)
    └── package.json             # Next.js 14, TypeScript, Tailwind CSS
```

## 🎨 Base Design System
- **Background Color**: `#1A3A2A` (Dark Forest Green)
- **Accent Color**: `#97BC62` (Vibrant Sage/Lime)
- **Frameworks**: Next.js 14 App Router, Tailwind CSS, FastAPI

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
# Create virtual environment if not created
python -m venv .venv
# Activate & install dependencies
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Run FastAPI server
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
API Health Check Endpoint: `http://127.0.0.1:8000/api/health`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev -- -p 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
