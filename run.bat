@echo off
echo =====================================================================
echo                AICTE CaseTrack Startup Launcher
echo      Integrated Institution Complaint & Overlap Monitoring Dashboard
echo =====================================================================

echo Starting FastAPI Backend on port 8000...
start "AICTE CaseTrack Backend" cmd /k "cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo Starting Next.js Frontend on port 3000...
start "AICTE CaseTrack Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo AICTE CaseTrack is launching!
echo Backend API Docs: http://localhost:8000/api/v1/docs
echo Frontend Web App: http://localhost:3000
echo =====================================================================
pause
