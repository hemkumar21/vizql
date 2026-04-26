# Claude Code Instructions
# CLAUDE.md

This file tells Claude Code how this project is structured, how to run it,
and the rules to follow when making changes.

---

## Project overview

NLQ Analytics — a full-stack app that converts plain English questions into
SQL queries, executes them against a SQLite database, and returns results
as charts, tables, and structured explanations.

**The core pipeline:**
```
User prompt → FastAPI → Gemma2 (local Ollama) → SQL → Safety check → SQLite → Result
```

---

## Monorepo structure

```
nlq-app/
├── backend/        Python / FastAPI / SQLite
├── frontend/       React 18 / TypeScript / Vite / Tailwind / shadcn
├── .github/        GitHub Actions CI
├── docker-compose.yml
└── start.sh
```

---

## How to run

### Both servers (development)
```bash
./start.sh
```

### Backend only
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Frontend only
```bash
cd frontend
npm run dev
```

### Docker (production-like)
```bash
docker compose up --build
# App at http://localhost:3000
```

---

## How to test

### Backend tests (32 tests, all must pass)
```bash
cd backend
python -m pytest tests/ -v
```

Tests use an in-memory SQLite database and mock Gemma2 via
`@patch('app.nlq_parser.httpx.Client')`. No running model required.

### TypeScript check
```bash
cd frontend
npx tsc --noEmit
```

### Full frontend build
```bash
cd frontend
npm run build
```

---

## Backend conventions

### File responsibilities — do not mix these
- `main.py` — routes only. No business logic.
- `nlq_parser.py` — the only file that calls Gemma2. Nothing else should make HTTP calls to the model.
- `safety.py` — the only file that validates SQL. Always call this before `execute_query()`.
- `schema_registry.py` — the only source of truth for allowed tables/columns. Do not hardcode table names anywhere else.
- `database.py` — the only file that touches SQLite. Always use `execute_query()`, never raw engine access from routes.

### Adding a new API endpoint
1. Add a Pydantic request + response model in `main.py`
2. Add the route function in `main.py`
3. If it executes SQL: call `validate_sql()` from `safety.py` first
4. Add a test in `tests/test_backend.py`

### Adding a new table to the data model
1. Add the `CREATE TABLE` statement in `database.py`
2. Add seed data in `database.py`
3. Register the table in `schema_registry.py` with all column types and labels
4. The safety layer and LLM prompt automatically pick up new tables from the registry

### Environment variables
All config comes from `.env` (loaded via `python-dotenv`). Never hardcode:
- `GEMMA2_BASE_URL` — default `http://192.168.1.17:3000`
- `GEMMA2_MODEL` — default `gemma2`
- `GEMMA2_TIMEOUT` — default `60`
- `DB_PATH` — default `./nlq_app.db`

---

## Frontend conventions

### State management — Zustand only
All shared state lives in `src/store/useQueryStore.ts`. Do not use
`useState` for anything that needs to be shared between the dashboard
and the chat panel. The pattern is:

```typescript
// Reading
const { activeResult } = useQueryStore()

// Writing
const { setActiveResult } = useQueryStore()
setActiveResult(result)
```

### API calls — only through src/api/nlq.ts
Never call `fetch()` directly in a component. All backend calls go through
the typed wrappers in `api/nlq.ts`. If you need a new endpoint, add a
function there first.

### Components — where things live
- `components/ui/` — shadcn primitives. These are base building blocks.
  Modify with care. Do not add business logic here.
- `components/dashboard/` — anything that reads `activeResult` and displays it
- `components/chat/` — anything related to sending prompts and showing messages
- New shared components that do not fit either panel go in `components/` directly

### Adding a new dashboard component
1. Create the file in `src/components/dashboard/`
2. Read data from `useQueryStore` — do not accept `result` as a prop
3. Import and place it in `App.tsx` inside the dashboard panel

### Styling
- Use Tailwind utility classes
- Use `cn()` from `src/lib/utils.ts` for conditional classes
- Dark mode works via the `.dark` class on `<html>` — toggled by `useQueryStore.toggleDark()`
- Never use inline style for colors — use CSS variables (`hsl(var(--primary))` etc.)

### shadcn components
The `components/ui/` components are copied source, not npm packages.
To add a new shadcn component:
1. Copy the source from shadcn/ui docs into `src/components/ui/`
2. Replace `import { cn } from "@/lib/utils"` — already correct
3. Do not install `@shadcn/ui` as a package

---

## The data model

```sql
orders     (order_id, customer_id, product_id, order_date, quantity, unit_price, region)
customers  (customer_id, name, segment, country)
products   (product_id, product_line, category)
```

`revenue` is always `quantity * unit_price` — it is not a stored column.
The schema registry exposes it as a derived field so the model knows how to use it.

---

## The Gemma2 / Ollama connection

The model runs locally at `http://192.168.1.17:3000` using Ollama.
The API is OpenAI-compatible — `POST /v1/chat/completions`.

The response must be JSON with exactly two keys:
```json
{ "sql": "SELECT ...", "explanation": "Plain English description" }
```

The system prompt in `nlq_parser.py` enforces this. If the model returns
anything else, `_parse_llm_json()` attempts to extract a JSON object from
the raw text. If that also fails, a `ValueError` is raised and a 500 is
returned to the frontend.

If Gemma2 is not running:
```bash
ollama serve
ollama run gemma2
```

---

## Safety rules — never bypass these

1. **Always call `validate_sql()` before `execute_query()`** — in every
   code path, without exception. The safety module is independent of the
   AI model for exactly this reason.

2. **Never add a table to `database.py` without adding it to `schema_registry.py`**
   — if a table exists in the DB but not in the registry, the model cannot
   query it and that is intentional.

3. **Never expose raw database errors to the frontend** — catch SQLAlchemy
   exceptions in `main.py` and return a `400` with a sanitized message.

4. **Never store secrets in code** — API keys, passwords, connection strings
   always go in `.env`. The `.env` file is in `.gitignore` and must never
   be committed.

---

## CI — what must pass before merging

All three jobs in `.github/workflows/ci.yml` must be green:

| Job | Command | Must pass |
|---|---|---|
| `backend` | `pytest tests/ -v` | 32/32 tests |
| `frontend` | `tsc --noEmit` + `vite build` | 0 errors |
| `docker` | `docker compose config` + `docker compose build` | No errors |

If you add a new feature, add a test for it in `tests/test_backend.py`
before the PR.

---

## Common tasks

### Run a raw SQL query against the database
```python
from app.database import execute_query
cols, rows = execute_query("SELECT * FROM orders LIMIT 5")
```

### Test the full pipeline without the frontend
```bash
curl -X POST http://localhost:8000/api/nlq/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "revenue by region in Q2 2024"}'
```

### See all available API endpoints
```
http://localhost:8000/docs
```

### Reset the database
```bash
rm backend/nlq_app.db
# Restart the backend — tables are recreated and reseeded automatically
```

### Check what Gemma2 is generating (debug)
Add a `print(raw)` after line `raw = _call_gemma2(...)` in `nlq_parser.py`.
Remove before committing.

---

## What is intentionally not in this project

- **JWT auth** — planned next. Sessions are UUID-keyed, ready to attach to users.
- **CSV upload** — planned. Would create dynamic SQLite tables per session.
- **Postgres** — swap `DATABASE_URL` in `database.py`, change `aiosqlite` to `asyncpg`.
- **Redis sessions** — swap `sessions.py` dict for Redis when multi-instance needed.
- **Rate limiting** — add `slowapi` middleware in `main.py`.
- **Schema tooltip in UI** — schema is loaded in the Zustand store, just needs a Tooltip component.
