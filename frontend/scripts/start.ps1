# Shomal Hospital Frontend - public:4000 + CMS:3000 + system admin:2000
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Test-Path .env.local)) {
    Copy-Item .env.local.example .env.local
    Write-Host "Created .env.local from example" -ForegroundColor Yellow
}

if (-not (Test-Path node_modules)) {
    npm install
}

$root = Split-Path $PSScriptRoot -Parent
$logDir = Join-Path $root ".run-logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

Write-Host ""
Write-Host "Starting Next.js (3 ports, separate distDir)..." -ForegroundColor Green
Write-Host "  Public site:     http://localhost:4000/fa" -ForegroundColor Cyan
Write-Host "  CMS builder:     http://localhost:3000/fa/admin" -ForegroundColor Cyan
Write-Host "  System admin:    http://localhost:2000/fa/console" -ForegroundColor Cyan
Write-Host ""

function Start-Next([string]$script, [string]$distDir, [string]$logName) {
    $log = Join-Path $logDir $logName
    $cmd = "`$env:NEXT_DIST_DIR='$distDir'; Set-Location '$pwd'; npm run $script 2>&1 | Tee-Object -FilePath '$log'"
    return Start-Process -FilePath "powershell" -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $cmd) -PassThru -WindowStyle Hidden
}

# Kill leftover next lock holders
@(2000, 3000, 4000) | ForEach-Object {
    Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}
Start-Sleep 1

$procs = @(
    (Start-Next "dev:public" ".next-public" "frontend-4000.log"),
    (Start-Next "dev:cms" ".next-cms" "frontend-3000.log"),
    (Start-Next "dev:admin" ".next-admin" "frontend-2000.log")
)

Write-Host ("PIDs: {0}" -f ($procs.Id -join ", ")) -ForegroundColor DarkGray
Write-Host ("Logs: {0}" -f $logDir) -ForegroundColor DarkGray
Write-Host "Press Ctrl+C to stop all frontends." -ForegroundColor Yellow
Write-Host ""

try {
    while ($true) {
        if ($procs | Where-Object { $_.HasExited }) { break }
        Start-Sleep -Seconds 5
    }
} finally {
    foreach ($p in $procs) {
        if ($p -and -not $p.HasExited) {
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        }
    }
    foreach ($port in @(2000, 3000, 4000)) {
        Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
            ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    }
}
