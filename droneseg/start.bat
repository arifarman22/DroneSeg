@echo off
title DroneSeg - Launcher
echo ============================================
echo   DroneSeg Vision Platform
echo ============================================
echo.

echo [1/2] Starting Backend (FastAPI) on port 8000...
start "DroneSeg Backend" cmd /k "cd /d f:\Drone_Seg\droneseg\backend && call venv\Scripts\activate && python run.py"

echo [2/2] Starting Frontend (Next.js) on port 3000...
start "DroneSeg Frontend" cmd /k "cd /d f:\Drone_Seg\droneseg\frontend && npm run dev"

echo.
echo ============================================
echo   Both services starting...
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:8000/api/docs
echo   Health:   http://localhost:8000/api/health
echo ============================================
echo.
echo Close this window anytime. Services run in separate windows.
pause
