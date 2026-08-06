# Shomal Hospital Frontend — Next.js (port 4000)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Test-Path .env.local)) {
    Copy-Item .env.local.example .env.local
    Write-Host "Created .env.local from example" -ForegroundColor Yellow
}

if (-not (Test-Path node_modules)) {
    npm install
}

Write-Host "`nStarting Shomal Hospital frontend on port 4000..." -ForegroundColor Green
Write-Host "  FA: http://localhost:4000/fa" -ForegroundColor Cyan
Write-Host "  EN: http://localhost:4000/en`n" -ForegroundColor Cyan
npm run dev
