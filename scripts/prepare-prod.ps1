# Prepare Auth + Users for production (Gateway unchanged)
$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "=== Shomal Hospital — Production prepare ===" -ForegroundColor Cyan
Write-Host "Root: $Root"

Write-Host "`n[1] Docker infra" -ForegroundColor Cyan
Set-Location $Root
if (-not (Test-Path ".env.prod")) {
    @(
        "AUTH_DB_PASSWORD=change_me_auth",
        "USERS_DB_PASSWORD=change_me_users",
        "REDIS_PASSWORD=change_me_redis"
    ) | Set-Content ".env.prod" -Encoding UTF8
    Write-Host "Created .env.prod — CHANGE PASSWORDS before real deploy" -ForegroundColor Yellow
}
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d

Write-Host "`n[2] JWT keys + sync gateway public key" -ForegroundColor Cyan
Set-Location (Join-Path $Root "auth-service")
if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
$env:Path = "$(Join-Path (Get-Location) '.venv\Scripts');$env:Path"
if (-not (Test-Path ".venv\.deps_ok")) {
    pip install -r requirements.txt
    New-Item -ItemType File -Path ".venv\.deps_ok" -Force | Out-Null
}
if (-not (Test-Path "keys\private.pem")) {
    python scripts\generate_keys.py
}
& (Join-Path $Root "scripts\sync-jwt-key.ps1")

Write-Host "`n[3] Production env files" -ForegroundColor Cyan
$authProd = Join-Path $Root "auth-service\.env.production"
$usersProd = Join-Path $Root "users-service\.env.production"
if (-not (Test-Path $authProd)) {
    Copy-Item (Join-Path $Root "auth-service\.env.production.example") $authProd
    Write-Host "Created auth-service/.env.production" -ForegroundColor Yellow
}
if (-not (Test-Path $usersProd)) {
    Copy-Item (Join-Path $Root "users-service\.env.production.example") $usersProd
    Write-Host "Created users-service/.env.production" -ForegroundColor Yellow
}
New-Item -ItemType Directory -Force -Path (Join-Path $Root "users-service\keys") | Out-Null
Copy-Item (Join-Path $Root "auth-service\keys\public.pem") (Join-Path $Root "users-service\keys\public.pem") -Force

Write-Host "`nDONE. Next:" -ForegroundColor Green
Write-Host "  Edit secrets in auth-service/.env.production and users-service/.env.production and .env.prod"
Write-Host "  Terminal1: cd auth-service;  .\scripts\start-prod.ps1"
Write-Host "  Terminal2: cd users-service; .\scripts\start-prod.ps1"
Write-Host "  Terminal3: start gateway (unchanged)"
Write-Host "  See PRODUCTION.md"
