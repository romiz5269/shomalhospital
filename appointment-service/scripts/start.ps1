# Appointments service — بیمارستان شمال — port 5003
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$Port = 5003

function Stop-PortListener([int]$port) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "  Port $port busy -> stopping $($proc.ProcessName) (PID $($proc.Id))" -ForegroundColor Yellow
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Start-Sleep 1
        }
    }
}

Write-Host "`n[1/4] Docker: Postgres appointments (:5436)" -ForegroundColor Cyan
docker compose up -d postgres-appointments
docker compose ps

Write-Host "`n[2/4] Wait healthy..." -ForegroundColor Cyan
for ($i = 1; $i -le 30; $i++) {
    $pg = docker inspect hospital-postgres-appointments --format "{{.State.Health.Status}}" 2>$null
    if ($pg -eq "healthy") { break }
    Start-Sleep 2
}
Write-Host "Postgres appointments: $pg" -ForegroundColor Green

Write-Host "`n[3/4] Python venv + Prisma" -ForegroundColor Cyan
if (-not (Test-Path .venv)) { python -m venv .venv }
$env:Path = "$(Resolve-Path .\.venv\Scripts);$env:Path"
if (-not (Test-Path .venv\.deps_ok)) {
    python -m pip install -U pip
    pip install -r requirements.txt
    New-Item -ItemType File -Path .venv\.deps_ok -Force | Out-Null
}

$pub = Resolve-Path "..\auth-service\keys\public.pem" -ErrorAction SilentlyContinue
if (-not $pub) {
    Write-Host "WARNING: auth-service public.pem missing - JWT verify will fail" -ForegroundColor Red
} else {
    Write-Host "JWT public key: $pub" -ForegroundColor Green
}

prisma generate
prisma db push --skip-generate

Write-Host "`n[4/4] Start Appointments on :$Port" -ForegroundColor Green
Stop-PortListener $Port
Write-Host "  Docs:  http://127.0.0.1:$Port/docs" -ForegroundColor Yellow
Write-Host "  Site:  http://127.0.0.1:8080/api/v1/appointment/... (via gateway + JWT)`n" -ForegroundColor Yellow
uvicorn app.main:app --host 127.0.0.1 --port $Port --reload
