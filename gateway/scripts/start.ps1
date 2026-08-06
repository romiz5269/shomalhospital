$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Test-Path node_modules)) { npm install }

# Sync JWT from auth-service
& (Join-Path $PSScriptRoot "..\..\scripts\sync-jwt-key.ps1")

Write-Host "`nStarting Gateway on http://127.0.0.1:8080" -ForegroundColor Green
Write-Host "Auth proxy: http://127.0.0.1:8080/api/v1/auth/*`n" -ForegroundColor Yellow
npm run dev
