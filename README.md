# NLQ Analytics

Ask questions about your data in plain English and get SQL, charts, and insights back instantly — no SQL knowledge required.

---

## Features

- **Natural Language Queries** — Type plain English, get SQL and results instantly.
- **Auto Chart Inference** — Bar and line charts generated automatically based on result shape.
- **Query Explainability** — See exactly how every query was constructed: filters, group-bys, aggregates, and source tables.
- **Conversation Memory** — Follow-up questions remember previous context.
- **SQL Safety Layer** — Blocks dangerous SQL before the database is touched.
- **CSV Upload** — Upload your own data and query it immediately.
- **Dark / Light Mode** — Toggle in the top right.
- **Docker Ready** — One command to run the entire stack.

---

## Tech Stack

- **Frontend** — React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts, Zustand
- **Backend** — Python 3.12, FastAPI, SQLAlchemy, SQLite
- **AI Model** — gpt-oss-120b via Hugging Face Router
- **Infra** — Docker Compose, nginx, GitHub Actions CI

---

## Quick Start

### Docker (recommended)

Clone the repo, add your Hugging Face token to `backend/.env`, then run:

```bash
git clone https://github.com/YOUR_USERNAME/nlq-app.git
cd nlq-app
cp backend/.env.example backend/.env
# Edit backend/.env and set HF_TOKEN=hf_your_token_here
docker compose up --build
```

- App → http://localhost:3000
- API → http://localhost:8080
- Docs → http://localhost:8080/docs

### Local Development

**Backend** (Terminal 1):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env         # Add your HF_TOKEN
uvicorn app.main:app --reload --port 8080
```

**Frontend** (Terminal 2):

```bash
cd frontend
npm install
npm run dev                  # → http://localhost:5173
```

Vite proxies `/api/*` and `/health` to `http://localhost:8080` automatically.

---

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
# Hugging Face — get token at huggingface.co/settings/tokens
# Enable: Inference → Make calls to Inference Providers
HF_TOKEN=hf_your_token_here

# Model — gpt-oss-120b for best quality, gpt-oss-20b for faster
HF_MODEL=openai/gpt-oss-120b

# Timeout in seconds — 120 recommended for large model cold starts
HF_TIMEOUT=120

# Database path
DB_PATH=./nlq_app.db

# Uploads directory
UPLOAD_DIR=./uploads
```

---

## API Reference

| Method | Endpoint                  | Description                     |
|--------|---------------------------|---------------------------------|
| `POST` | `/api/nlq/query`          | Parse + execute — main endpoint |
| `POST` | `/api/nlq/parse`          | NLQ → SQL only                  |
| `POST` | `/api/nlq/execute`        | Execute raw SQL                 |
| `POST` | `/api/conversation/refine`| Follow-up with context          |
| `POST` | `/api/data/upload`        | Upload CSV / Excel file         |
| `GET`  | `/api/schema/describe`    | Full schema                     |
| `GET`  | `/health`                 | Health check                    |

Interactive docs: `http://localhost:8080/docs`

### Example Request

```bash
curl -X POST http://localhost:8080/api/nlq/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "revenue by region in Q2 2024"}'
```

### Example Response

```json
{
  "columns": ["region", "revenue"],
  "rows": [["North", 41000], ["East", 28200]],
  "inferred_chart": "bar",
  "sql": "SELECT region, SUM(quantity * unit_price) AS revenue FROM orders ...",
  "warnings": [],
  "explain": {
    "filters": ["order_date between 2024-04-01 and 2024-06-30"],
    "groupBy": ["region"],
    "aggregates": ["SUM(quantity * unit_price) AS revenue"],
    "sourceTables": ["orders"],
    "naturalExplanation": "Total revenue grouped by region for Q2 2024."
  },
  "conversation_id": "abc-123-def-456"
}
```

---

## Data Model

The app ships with 30 sample orders across 2024 spread across three tables:

```sql
orders     (order_id, customer_id, product_id, order_date, quantity, unit_price, region)
customers  (customer_id, name, segment, country)
products   (product_id, product_line, category)
```

`revenue` is a derived column computed as `quantity * unit_price` — not stored.

You can also upload your own CSV and query it instantly.

---

## Sample Queries

Direct queries:

```
revenue by region in Q2 2024
top 5 customers by total spend
monthly revenue trend in 2024
order count by product line
average order value by country
```

Follow-ups using conversation memory:

```
break it down by segment
show only the top 3
filter to enterprise customers only
```

---

## Running Tests

```bash
cd backend
python -m pytest tests/ -v
# 32 passed — HF API is mocked, no network required
```

---

## Security

- Only `SELECT` statements are allowed — all other SQL is rejected before execution.
- Table and column references are validated against a strict whitelist.
- A denylist blocks `DROP`, `DELETE`, `INSERT`, `UPDATE`, `UNION`, comments, and semicolons.
- Query results are capped at 10,000 rows.
- No secrets in code — `.env` is gitignored.

---

## Roadmap

Completed:

- Natural language → SQL pipeline
- Query explainability
- Conversation memory
- Bar / line chart auto-inference
- Docker + GitHub Actions CI
- CSV / Excel upload

Planned:

- JWT authentication
- Postgres support
- Query result caching
- Schema tooltip on hover

---

## Contributing

```bash
git checkout -b feature/your-feature
# make changes + add tests
cd backend && python -m pytest tests/ -v   # must be 32 passed
git push origin feature/your-feature
# open a PR — all 3 CI jobs must be green
```

---

## License

MIT — see [LICENSE](LICENSE)