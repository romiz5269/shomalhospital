# همه چیز یکجا: Postgres + Redis (Docker) + Auth (Python)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$Port = 5001

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

Write-Host "`n[1/5] Docker: Postgres + Redis" -ForegroundColor Cyan
docker compose up -d postgres-auth redis
docker compose ps

Write-Host "`n[2/5] Wait for healthy..." -ForegroundColor Cyan
for ($i = 1; $i -le 30; $i++) {
    $pg = docker inspect hospital-postgres-auth --format "{{.State.Health.Status}}" 2>$null
    $rd = docker inspect hospital-redis --format "{{.State.Health.Status}}" 2>$null
    if ($pg -eq "healthy" -and $rd -eq "healthy") { break }
    Start-Sleep 2
}
$ping = docker exec hospital-redis redis-cli ping
Write-Host "Redis: $ping | Postgres: $pg" -ForegroundColor Green

Write-Host "`n[3/5] Python venv + deps" -ForegroundColor Cyan
if (-not (Test-Path .venv)) { python -m venv .venv }
$env:Path = "$(Resolve-Path .\.venv\Scripts);$env:Path"
if (-not (Test-Path .venv\.deps_ok)) {
    python -m pip install -U pip
    pip install -r requirements.txt
    New-Item -ItemType File -Path .venv\.deps_ok -Force | Out-Null
}

Write-Host "`n[4/5] Keys + DB schema" -ForegroundColor Cyan
if (-not (Test-Path keys\private.pem)) {
    python scripts\generate_keys.py
}
New-Item -ItemType Directory -Force -Path uploads, static | Out-Null
prisma generate
prisma db push --skip-generate
python scripts\seed_admin.py 09000000000 "Admin@12345" 2>$null

Write-Host "`n[5/5] Start Auth" -ForegroundColor Green
Stop-PortListener $Port
Write-Host "  Browser: http://127.0.0.1:$Port/docs" -ForegroundColor Yellow
Write-Host "  Test:    .\scripts\test-interactive.ps1  (2nd terminal)`n" -ForegroundColor Yellow
uvicorn app.main:app --host 127.0.0.1 --port $Port --reload --log-level info
