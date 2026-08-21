@echo off
cd /d "%~dp0"
echo Starting PostgreSQL (Docker)...
docker compose up -d
echo Waiting for PostgreSQL to be ready...
timeout /t 8 /nobreak >nul
docker compose ps
