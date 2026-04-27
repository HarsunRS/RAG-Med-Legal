#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Start Ollama if not already running
if ! pgrep -x ollama > /dev/null 2>&1; then
  echo "[start-dev] Starting Ollama..."
  ollama serve &
  OLLAMA_PID=$!
  sleep 2
else
  echo "[start-dev] Ollama already running."
fi

# Start backend
echo "[start-dev] Starting FastAPI backend on :8000..."
cd "$ROOT/backend"
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 > /tmp/rag-backend.log 2>&1 &
BACKEND_PID=$!
echo "[start-dev] Backend PID: $BACKEND_PID (logs: /tmp/rag-backend.log)"

# Cleanup on Ctrl-C
trap 'echo "[start-dev] Stopping..."; kill $BACKEND_PID 2>/dev/null; exit 0' SIGINT

# Start frontend (foreground)
echo "[start-dev] Starting Next.js frontend on :3000..."
cd "$ROOT/frontend"
npm run dev
