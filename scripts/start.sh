#!/usr/bin/env bash
cd "$(dirname "$0")/.."

echo "Starting Backend..."
backend/.venv/bin/python backend/app.py &
BACKEND_PID=$!

echo "Starting Frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo "Press Ctrl+C to stop both servers."
wait
