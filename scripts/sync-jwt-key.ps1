# Sync auth public key -> gateway JWT_PUBLIC_KEY
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$pub = Join-Path $root "auth-service\keys\public.pem"
$gwEnv = Join-Path $root "gateway\.env"

if (-not (Test-Path $pub)) {
    Write-Host "Missing public.pem - run auth-service scripts/generate_keys.py first" -ForegroundColor Red
    exit 1
}

$key = (Get-Content $pub -Raw).Trim().Replace("`r", "").Replace("`n", "\n")
$content = Get-Content $gwEnv -Raw
if ($content -match "JWT_PUBLIC_KEY=.*") {
    $content = $content -replace "JWT_PUBLIC_KEY=.*", "JWT_PUBLIC_KEY=$key"
} else {
    $content += "`nJWT_PUBLIC_KEY=$key`n"
}
Set-Content -Path $gwEnv -Value $content -NoNewline
Write-Host "JWT_PUBLIC_KEY synced to gateway/.env" -ForegroundColor Green
