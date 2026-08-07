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
3. In Vercel → Settings → Environment Variables, add `HERMES_ENDPOINT` and
   `HERMES_API_KEY` for the backend. Add `WEB_API_KEY` only if API-key
   protection is wanted.
4. If `WEB_API_KEY` is enabled, add the same value as `VITE_WEB_API_KEY` so
   Vite embeds the client header during the frontend build. `VITE_*` values
   are build-time values and are not read from the browser at runtime.
5. Leave `VITE_API_BASE_URL` unset (or empty) for this single-project setup;
   the frontend then calls `/health` and `/chat` on the current Vercel origin.
6. Redeploy after adding or changing variables; Vercel applies them to new
   deployments only.
