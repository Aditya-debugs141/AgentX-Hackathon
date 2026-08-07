# AgentX Hackathon

A full-stack Smart Campus Assistant powered by FastAPI backend and React + Vite + Tailwind UI.

## Vercel Deployment

This project is configured for single-click deployment on [Vercel](https://vercel.com).

### Files configured for Vercel:
- [`vercel.json`](file:///D:/Projects/AgentX-Hackathon/vercel.json): Configures `@vercel/python` for the FastAPI backend and `@vercel/static-build` for the React frontend.
- [`api/index.py`](file:///D:/Projects/AgentX-Hackathon/api/index.py): Entrypoint for serverless Python function targeting `backend/main.py`.
- [`backend/requirements.txt`](file:///D:/Projects/AgentX-Hackathon/backend/requirements.txt): Python dependencies for serverless runtime.
- [`frontend/src/App.tsx`](file:///D:/Projects/AgentX-Hackathon/frontend/src/App.tsx): Dynamic API base URL using `import.meta.env.VITE_API_BASE_URL`.

### Steps to Deploy:
1. Push this repository to GitHub/GitLab/Bitbucket.
2. Import project into Vercel dashboard.
3. Keep default settings (Vercel will detect `vercel.json` and deploy both backend and frontend automatically).
