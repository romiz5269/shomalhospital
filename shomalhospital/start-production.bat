@echo off
REM Production — بدون reload، frontend build شده
cd /d "%~dp0"

call start-docker.bat

echo.
echo === Backend (production) ===
start "PM Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && if not exist .env copy .env.example .env && uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 1"

echo.
echo === Frontend (production) ===
start "PM Frontend" cmd /k "cd /d %~dp0frontend && if not exist .env.local copy .env.production.example .env.local && call npm run build && npm run start -- -H 0.0.0.0 -p 3000"

echo.
echo Production started:
echo   UI:  http://SERVER-IP:3000
echo   API: http://SERVER-IP:8001/api
pause
