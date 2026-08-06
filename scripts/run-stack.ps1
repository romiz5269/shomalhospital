# Shomal Hospital — start full stack (Docker already up)
# Run each block in separate terminal OR use this script to launch all
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"

function Stop-Port([int]$port) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
        if ($proc -and $proc.ProcessName -notin @("System", "Idle")) {
            Write-Host "Stopping port $port -> $($proc.ProcessName) PID $($proc.Id)" -ForegroundColor Yellow
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "`n=== Shomal Hospital Stack ===" -ForegroundColor Cyan
Write-Host "Stopping old listeners..." -ForegroundColor Yellow
5001,5002,5003,5004,5005,8080,4000 | ForEach-Object { Stop-Port $_ }
Start-Sleep 2

Write-Host "`nSync JWT key to gateway..." -ForegroundColor Cyan
& (Join-Path $root "scripts\sync-jwt-key.ps1")

$services = @(
    @{ Name = "Auth";        Dir = "auth-service";        Script = "start.ps1" },
    @{ Name = "Users";       Dir = "users-service";       Script = "start.ps1" },
    @{ Name = "Appointment"; Dir = "appointment-service"; Script = "start.ps1" },
    @{ Name = "Insurance";   Dir = "insurance-service";   Script = "start.ps1" },
    @{ Name = "Blog";        Dir = "blog-service";        Script = "start.ps1" },
    @{ Name = "Gateway";     Dir = "gateway";             Script = "start.ps1" },
    @{ Name = "Frontend";    Dir = "frontend";            Script = "start.ps1" }
)

foreach ($svc in $services) {
    $path = Join-Path $root $svc.Dir
    $script = Join-Path $path "scripts\$($svc.Script)"
    if (-not (Test-Path $script)) {
        Write-Host "SKIP $($svc.Name) - missing $script" -ForegroundColor Red
        continue
    }
    Write-Host "Launching $($svc.Name)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList @(
        "-NoExit", "-Command",
        "Set-Location '$path'; `$env:PYTHONUTF8='1'; `$env:PYTHONIOENCODING='utf-8'; .\scripts\$($svc.Script)"
    )
    if ($svc.Name -eq "Auth") { Start-Sleep 25 }
    elseif ($svc.Name -in @("Users","Appointment","Insurance","Blog")) { Start-Sleep 8 }
    else { Start-Sleep 3 }
}

Write-Host "`n=== URLs ===" -ForegroundColor Cyan
Write-Host "  Frontend FA:  http://localhost:4000/fa"
Write-Host "  Frontend EN:  http://localhost:4000/en"
Write-Host "  Gateway:      http://127.0.0.1:8080/health"
Write-Host "  Auth API:     http://127.0.0.1:8080/api/v1/auth/health"
Write-Host "  Insurance:    http://127.0.0.1:5004/public"
Write-Host "  Blog:         http://127.0.0.1:5005/public/posts"
Write-Host "`nEach service opened in its own PowerShell window.`n" -ForegroundColor Green
