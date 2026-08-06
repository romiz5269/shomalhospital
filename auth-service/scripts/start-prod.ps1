# Production start Auth — port 5001 (behind gateway)
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
$env:OTP_DEV_RETURN_CODE = "false"
$env:OTP_DEV_FIXED_CODE = ""

$Workers = if ($env:WEB_CONCURRENCY) { $env:WEB_CONCURRENCY } else { 4 }

if (-not (Test-Path "keys\private.pem") -or -not (Test-Path "keys\public.pem")) {
    Write-Host "Missing keys/private.pem or public.pem — run: python scripts\generate_keys.py" -ForegroundColor Red
    exit 1
}

$env:Path = "$(Resolve-Path .\.venv\Scripts);$env:Path"
prisma generate
prisma db push --skip-generate

Write-Host "Auth PRODUCTION gunicorn w=$Workers :5001" -ForegroundColor Green
Write-Host "Sync public.pem to gateway JWT_PUBLIC_KEY (scripts/sync-jwt-key.ps1)" -ForegroundColor Yellow

gunicorn app.main:app `
    -k uvicorn.workers.UvicornWorker `
    -w $Workers `
    -b 127.0.0.1:5001 `
    --timeout 60 `
    --graceful-timeout 30 `
    --access-logfile - `
    --error-logfile -
