# OyaApply


An agentic human-in-the-loop job-search assistant for Nigerians looking for local, remote or international roles.

Every day it finds new jobs, scores them against your CV, and saves the matches. When you open a job and click **Tailor my CV**, it rewrites your CV for that role, using only facts already in your CV. **You apply yourself.** Nothing is ever sent to an employer on your behalf.

Built for the AI in Nigeria AI Startup Challenge (Lagos 2026).

## What it does

- **Daily search on your schedule.** Each user picks a daily run time (default 18:00) in their own timezone.
- **Matching.** Jobs are pre-filtered (age, region, job type, relevance), then scored 0 to 100 against the user's master CV by a light LLM. Every scored job is saved, so nothing is paid for twice.
- **On-demand CV tailoring.** Triggered by a click, never automatic, so cost is only spent on jobs the user cares about.
- **Fact-checked output.** The model proposes rewrites. Code then verifies each one: any number or capitalised term that is not in the user's CV causes that rewrite to be discarded and the original bullet kept. All roles, education, certifications and contact details are copied from the master CV, never generated.
- **Tracker.** Mark jobs as applied, interviewing or dismissed, with notes.
- **Print or save as PDF** for tailored CVs, with a compare view and highlighted changes.

### Known limits
- The fact check cannot detect a stronger verb (for example "led" in place of "contributed"). Users should read every tailored CV before sending it.
- Sources today are Remotive, Himalayas and Remote OK (remote-first boards). Local Nigerian job boards are not supported yet.
- Voice interview practice is planned but not built.

## How it works

```
 Remotive / Himalayas / Remote OK
              |
              |  ingest (3x a day, 05:00 / 11:00 / 16:00 UTC)
              v
        shared job pool  (Supabase Postgres)
              |
              |  daily run at each user's chosen local time,
              |  or "Search now" (3 per day)
              v
   prefilter -> LLM scoring vs master CV -> saved matches
              |
              |  user opens a job and clicks "Tailor my CV"
              v
   LLM rewrite -> code fact-check -> tailored CV version
```

Users never query the job sources directly. The scheduler fills a shared pool, and each user's search reads from that pool.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router), Tailwind CSS v4, TanStack Query, supabase-js, lucide-react |
| API | FastAPI (Python) |
| Database, auth, file storage | Supabase (Postgres, Auth, Storage, row-level security) |
| LLM | Groq: `openai/gpt-oss-120b` (heavy tasks), `openai/gpt-oss-20b` (scoring) |
| Scheduler | Python worker run by GitHub Actions on a timer |
| Hosting | Vercel (frontend), Render (API), GitHub Actions (scheduler) |

## Repository layout

```
job-agent/
  backend/
    app/
      main.py              FastAPI app, CORS, routers
      config.py            settings read from environment variables
      auth.py              Bearer token check via Supabase
      timeutil.py          timestamp parsing helpers
      routers/             me, jobs, search
      schemas/             Pydantic models (API, tailoring)
      services/            matching, tailoring, usage, jobs, runs, CV storage
    workers/
      scheduler.py         one tick: ingest if due, run due users' searches
      search.py            one user's search run
      tailor.py            CV tailoring
      dev_token.py         helper for getting a test token
    database/migrations/   numbered SQL files (001 onward)
    tests/
  frontend/
    src/
      app/                 pages (landing, login, onboarding, app screens)
      components/
      lib/                 API client, hooks, types
      config/brand.ts      product name and tagline
```

## Run it locally

You need Python 3.10 or newer, Node 20.9 or newer, a Supabase project, and a Groq API key. Commands are for Windows PowerShell.

### 1. Database
Open the Supabase SQL editor and run every file in `backend/database/migrations/` in numeric order.

### 2. Backend
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```
Create `backend/.env` with your keys (see [Environment variables](#environment-variables)), then:
```powershell
uvicorn app.main:app --reload
```
The API runs at http://localhost:8000 and its docs are at http://localhost:8000/docs.

Run one scheduler check by hand:
```powershell
python -m workers.scheduler --once
```

### 3. Frontend
```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
notepad .env.local
npm run dev
```
Open http://localhost:3000.

### 4. Tests
```powershell
cd backend
pytest
```

## Environment variables

Never commit real values. `.env` and `.env.local` are git-ignored.

**Backend (`backend/.env`)**

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key. Bypasses row-level security, so every query filters by `user_id` in code |
| `SUPABASE_ANON_KEY` | Public key, used to validate user tokens |
| `GROQ_API_KEY` | Groq API key |
| `FRONTEND_ORIGIN` | Exact address of the frontend, for CORS (no trailing slash) |

Optional tuning values (match limits, daily caps and so on) live in `backend/app/config.py`.

**Frontend (`frontend/.env.local`)**

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `NEXT_PUBLIC_API_URL` | Address of the API, for example `http://localhost:8000` |

`NEXT_PUBLIC_` values are baked in at build time. Redeploy after changing them.

## Deployment

1. **Frontend on Vercel.** Import the repo, set Root Directory to `frontend`, add the three `NEXT_PUBLIC_` variables.
2. **API on Render.** Web service, Root Directory `backend`, start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, plus the backend variables. Set `FRONTEND_ORIGIN` to the Vercel address.
3. **Scheduler on GitHub Actions.** A workflow at `.github/workflows/scheduler.yml` runs `python -m workers.scheduler --once` every 30 minutes. Add the backend variables as repository secrets. Scheduled runs can start a few minutes late.
4. **Supabase.** Set Site URL and redirect URLs to the Vercel address. Add custom SMTP before launch, because the built-in email sender is heavily rate-limited.

## Safeguards and limits

- Every API endpoint requires a Supabase Bearer token. The service-role key bypasses row-level security, so tests assert that each query is scoped to the user.
- Per user, per day: 10 CV tailorings, 5 CV uploads (5 MB maximum), 3 manual searches.
- One scheduled run per user per local day, enforced by a database unique index.
- A search stops after two consecutive LLM errors and saves a partial result.
- LLM responses are validated with Pydantic and retried. Token usage is logged to `llm_usage`.
- CORS is limited to the configured frontend origin.

## Data sources and credit

Job listings come from [Remotive](https://remotive.com), [Himalayas](https://himalayas.app) and [Remote OK](https://remoteok.com). Each job links back to its original listing, and the product follows each source's terms, including Remotive's limit of 4 requests a day.

## Roadmap

- Voice interview practice per job, with feedback
- More job sources, including local Nigerian boards
- Delete-my-data, and privacy policy and terms pages
- Evaluation suite for matching and tailoring quality
- Installable web app (PWA)
- Final product name and domain