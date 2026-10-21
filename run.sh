#!/bin/bash
set -e

echo "====================================================================="
echo "               AICTE CaseTrack Startup Launcher"
echo "     Integrated Institution Complaint & Overlap Monitoring Dashboard"
echo "====================================================================="

# Start backend in background
cd backend
python -m uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Start frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "AICTE CaseTrack is running!"
echo "Backend:  http://localhost:8000/api/v1/docs"
echo "Frontend: http://localhost:3000"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
