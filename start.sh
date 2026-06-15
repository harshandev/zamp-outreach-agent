#!/bin/bash
set -e

echo "Starting Zamp AI Outreach Agent..."

# Backend
cd backend
../.venv/bin/uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:3000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
