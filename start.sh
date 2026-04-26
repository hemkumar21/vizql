#!/usr/bin/env bash
# start.sh — start backend and frontend together
# Usage: ./start.sh

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting NLQ Analytics..."
echo ""

# ── Backend ────────────────────────────────────────────────────
echo "[1/2] Starting FastAPI backend on :8000"
cd "$ROOT/backend"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "  Created .env from .env.example"
fi

if [ ! -d .venv ]; then
  echo "  Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -r requirements.txt -q

uvicorn app.main:app --port 8000 --reload &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# ── Frontend ───────────────────────────────────────────────────
echo ""
echo "[2/2] Starting Vite frontend on :5173"
cd "$ROOT/frontend"

if [ ! -d node_modules ]; then
  echo "  Installing npm deps..."
  npm install --silent
fi

npm run dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

# ── Cleanup on exit ────────────────────────────────────────────
echo ""
echo "  App running at http://localhost:5173"
echo "  Press Ctrl+C to stop both servers"
echo ""

trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait