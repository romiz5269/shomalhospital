@echo off

cd /d "%~dp0"

call start-docker.bat

cd backend

if not exist venv python -m venv venv

call venv\Scripts\activate.bat

pip install -r requirements.txt -q

if not exist .env copy .env.example .env

echo Starting backend on 0.0.0.0:8001 (network access)...

uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

