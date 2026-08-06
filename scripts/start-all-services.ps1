# Start all backend microservices (separate windows)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

Write-Host "`n=== Shomal Hospital — Start All Services ===" -ForegroundColor Cyan
Write-Host "Gateway is NOT started here (unchanged)." -ForegroundColor Yellow
Write-Host "Open each service in its own terminal, or run start.ps1 in each folder.`n"

$services = @(
    @{ Name = "Auth";         Path = "auth-service";         Port = 5001 },
    @{ Name = "Users";        Path = "users-service";        Port = 5002 },
    @{ Name = "Appointment";  Path = "appointment-service";  Port = 5003 },
    @{ Name = "Insurance";    Path = "insurance-service";    Port = 5004 },
    @{ Name = "Blog";         Path = "blog-service";         Port = 5005 }
)

foreach ($svc in $services) {
    $full = Join-Path $root $svc.Path
    if (Test-Path (Join-Path $full "scripts\start.ps1")) {
        Write-Host "  $($svc.Name) -> port $($svc.Port) : $full\scripts\start.ps1" -ForegroundColor Green
    } else {
        Write-Host "  $($svc.Name) -> MISSING start.ps1" -ForegroundColor Red
    }
}

Write-Host "  Frontend: npm run dev -> http://localhost:4000/fa`n" -ForegroundColor Green

Write-Host "Public API (no JWT via gateway):" -ForegroundColor Cyan
Write-Host "  Insurance: http://127.0.0.1:5004/public"
Write-Host "  Blog:      http://127.0.0.1:5005/public/posts`n"
