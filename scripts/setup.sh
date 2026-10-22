#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

echo "=== Document2Excel AI Setup (Linux/macOS) ==="

if [ ! -d "backend/.venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv backend/.venv
fi

echo "Installing backend dependencies into isolated .venv..."
backend/.venv/bin/pip install -r backend/requirements.txt

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo "Setup complete. Run ./scripts/start.sh to launch."
