# Production start Insurance — port 5004 (behind gateway)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (Test-Path ".env.production") {
    Write-Host "Loading .env.production" -ForegroundColor Cyan
    Get-Content ".env.production" | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        $k, $v = $_ -split '=', 2
        if ($k -and $null -ne $v) {
            [Environment]::SetEnvironmentVariable($k.Trim(), $v.Trim(), "Process")
        }
    }
}

$env:APP_ENV = "production"
$env:DEBUG = "false"

$Workers = if ($env:WEB_CONCURRENCY) { $env:WEB_CONCURRENCY } else { 2 }

$pub = $env:JWT_PUBLIC_KEY_PATH
if (-not $pub) { $pub = ".\keys\public.pem" }
if (-not (Test-Path $pub)) {
    $fallback = "..\auth-service\keys\public.pem"
    if (Test-Path $fallback) {
        New-Item -ItemType Directory -Force -Path "keys" | Out-Null
        Copy-Item $fallback "keys\public.pem" -Force
        Write-Host "Copied auth public.pem -> insurance-service/keys/public.pem" -ForegroundColor Yellow
    } else {
        Write-Host "Missing JWT public key at $pub" -ForegroundColor Red
        exit 1
    }
}

$env:Path = "$(Resolve-Path .\.venv\Scripts);$env:Path"
prisma generate
prisma db push --skip-generate

Write-Host "Insurance PRODUCTION gunicorn w=$Workers :5004" -ForegroundColor Green

gunicorn app.main:app `
    -k uvicorn.workers.UvicornWorker `
    -w $Workers `
    -b 127.0.0.1:5004 `
    --timeout 60 `
    --graceful-timeout 30 `
    --access-logfile - `
    --error-logfile -
