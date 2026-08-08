# Shomal Hospital - canonical startup (ASCII-only strings for Windows PowerShell)
# Usage: .\scripts\start-all.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
if (-not $root) { $root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path }

$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"
$logDir = Join-Path $root ".run-logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-Step([string]$msg) { Write-Host ""; Write-Host ">>> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg) { Write-Host "  OK  $msg" -ForegroundColor Green }
function Write-Fail([string]$msg) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "START FAILED: $msg" -ForegroundColor Red
    Write-Host "Logs: $logDir" -ForegroundColor Yellow
    Write-Host "Start Docker Desktop, then run:" -ForegroundColor Yellow
    Write-Host "  .\scripts\start-all.ps1" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}

function Stop-Port([int]$port) {
    $seen = @{}
    $conns = @(Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue)
    foreach ($c in $conns) {
        $procId = $c.OwningProcess
        if (-not $procId -or $procId -eq 0) { continue }
        if ($seen.ContainsKey($procId)) { continue }
        $seen[$procId] = $true
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if (-not $proc -or $proc.ProcessName -in @("System", "Idle")) { continue }
        Write-Host ("  stop :{0} {1} PID {2}" -f $port, $proc.ProcessName, $procId) -ForegroundColor DarkYellow
        $prev = $ErrorActionPreference
        $ErrorActionPreference = "SilentlyContinue"
        try {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", "taskkill /F /T /PID $procId >nul 2>&1") -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue | Out-Null
        } catch { }
        finally { $ErrorActionPreference = $prev }
    }
}

function Stop-GatewayZombies() {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
        Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
            Where-Object {
                $_.CommandLine -and (
                    $_.CommandLine -match 'hospital site\\gateway' -or
                    $_.CommandLine -match 'hospital site/gateway' -or
                    ($_.CommandLine -match 'tsx' -and $_.CommandLine -match 'server\.ts')
                )
            } |
            ForEach-Object {
                Write-Host ("  stop zombie gateway PID {0}" -f $_.ProcessId) -ForegroundColor DarkYellow
                Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
            }
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Wait-HttpOk([string]$Url, [int]$Seconds = 60, [string]$Label = "") {
    for ($i = 1; $i -le $Seconds; $i++) {
        try {
            $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true }
        } catch { }
        if ($Label -and ($i % 10 -eq 0)) {
            Write-Host ("  ... waiting {0} ({1}/{2}s) - first Next compile is slow" -f $Label, $i, $Seconds) -ForegroundColor DarkGray
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Start-Uvicorn([string]$Name, [string]$Dir, [int]$Port) {
    $work = Join-Path $root $Dir
    $uvi = Join-Path $work ".venv\Scripts\uvicorn.exe"
    if (-not (Test-Path $uvi)) {
        $uvi = Join-Path $root "auth-service\.venv\Scripts\uvicorn.exe"
    }
    if (-not (Test-Path $uvi)) {
        Write-Fail ("uvicorn not found for {0} (check {1}\.venv)" -f $Name, $Dir)
    }
    Stop-Port $Port
    Start-Sleep -Milliseconds 400
    $out = Join-Path $logDir ("{0}.out.log" -f $Name)
    $err = Join-Path $logDir ("{0}.err.log" -f $Name)
    Write-Host ("  start {0} :{1}" -f $Name, $Port) -ForegroundColor Green
    Start-Process -FilePath $uvi `
        -ArgumentList @("app.main:app", "--host", "127.0.0.1", "--port", "$Port") `
        -WorkingDirectory $work `
        -RedirectStandardOutput $out `
        -RedirectStandardError $err `
        -WindowStyle Hidden | Out-Null

    $health = "http://127.0.0.1:$Port/health"
    if (-not (Wait-HttpOk $health 55)) {
        Write-Host ("----- {0} err log (tail) -----" -f $Name) -ForegroundColor DarkGray
        if (Test-Path $err) { Get-Content $err -Tail 25 | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray } }
        Write-Fail ("{0} did not start on port {1} ({2})" -f $Name, $Port, $health)
    }
    Write-Ok ("{0} health 200" -f $Name)
}

function Start-NpmDev([string]$Name, [string]$Dir, [string]$NpmScript, [int]$Port, [string]$DistDir) {
    $work = Join-Path $root $Dir
    Stop-Port $Port
    Start-Sleep -Milliseconds 400
    $log = Join-Path $logDir ("{0}.out.log" -f $Name)
    $cmd = "`$env:PYTHONUTF8='1'; `$env:NEXT_DIST_DIR='$DistDir'; Set-Location '$work'; npm run $NpmScript *> '$log'"
    Write-Host ("  start {0} :{1} ({2})" -f $Name, $Port, $NpmScript) -ForegroundColor Green
    Start-Process -FilePath "powershell" `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $cmd) `
        -WindowStyle Hidden | Out-Null
}

Write-Host ""
Write-Host "=== Shomal Hospital start-all ===" -ForegroundColor Cyan
Write-Step "Free ports"
@(2000, 3000, 4000, 5001, 5002, 5003, 5004, 5005, 8080) | ForEach-Object { Stop-Port $_ }
Start-Sleep 2

Write-Step "Sync JWT"
$sync = Join-Path $PSScriptRoot "sync-jwt-key.ps1"
if (Test-Path $sync) { & $sync }

Write-Step "Docker: Redis + Postgres"
$ensure = Join-Path $PSScriptRoot "ensure-docker.ps1"
& $ensure
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Docker/Redis/Postgres not ready. Open Docker Desktop first."
}
Write-Ok "Infra ready"

Write-Step "Backends (health-gated)"
Start-Uvicorn -Name "auth" -Dir "auth-service" -Port 5001
Start-Uvicorn -Name "users" -Dir "users-service" -Port 5002
Start-Uvicorn -Name "appointment" -Dir "appointment-service" -Port 5003
Start-Uvicorn -Name "insurance" -Dir "insurance-service" -Port 5004
Start-Uvicorn -Name "blog" -Dir "blog-service" -Port 5005

Write-Step "Gateway"
Stop-GatewayZombies
Stop-Port 8080
Start-Sleep 1
$gwLog = Join-Path $logDir "gateway.out.log"
$gwDir = Join-Path $root "gateway"
$tsx = Join-Path $gwDir "node_modules\.bin\tsx.cmd"
if (-not (Test-Path $tsx)) { $tsx = Join-Path $gwDir "node_modules\.bin\tsx.ps1" }
if (-not (Test-Path $tsx)) {
    Write-Fail "gateway tsx not found - run npm install in gateway/"
}
# Kafka/MinIO optional - skipped for local speed (ENABLE_OPTIONAL_PROVIDERS=true to enable)
$gwCmd = "`$env:ENABLE_OPTIONAL_PROVIDERS='false'; `$env:STRICT_PROVIDERS='false'; `$env:REDIS_HOST='127.0.0.1'; Set-Location '$gwDir'; & '$tsx' src/server.ts *> '$gwLog'"
Write-Host "  start gateway :8080 (Redis only; Kafka/MinIO skipped on purpose)" -ForegroundColor Green
Start-Process -FilePath "powershell" -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $gwCmd) -WindowStyle Hidden | Out-Null
if (-not (Wait-HttpOk "http://127.0.0.1:8080/health" 20 "gateway")) {
    Write-Host "----- gateway log (tail) -----" -ForegroundColor DarkGray
    if (Test-Path $gwLog) { Get-Content $gwLog -Tail 40 | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray } }
    Write-Fail "Gateway did not start on :8080"
}
Write-Ok "gateway health 200"

Write-Step "Frontends (4000 / 3000 / 2000)"
Write-Host "  Note: first Next.js compile can take 30-90s - not a hang." -ForegroundColor Yellow
Start-NpmDev -Name "frontend-public" -Dir "frontend" -NpmScript "dev:public" -Port 4000 -DistDir ".next-public"
Start-NpmDev -Name "frontend-cms" -Dir "frontend" -NpmScript "dev:cms" -Port 3000 -DistDir ".next-cms"
Start-NpmDev -Name "frontend-admin" -Dir "frontend" -NpmScript "dev:admin" -Port 2000 -DistDir ".next-admin"

if (-not (Wait-HttpOk "http://127.0.0.1:4000/fa" 120 "site:4000")) {
    Write-Host "----- frontend-public log (tail) -----" -ForegroundColor DarkGray
    $fl = Join-Path $logDir "frontend-public.out.log"
    if (Test-Path $fl) { Get-Content $fl -Tail 40 | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray } }
    Write-Fail "Public site did not start on :4000"
}
Write-Ok "public site :4000"
if (Wait-HttpOk "http://127.0.0.1:3000/fa/admin" 30 "cms:3000") {
    Write-Ok "CMS :3000"
} else {
    Write-Host "  WARN CMS :3000 still compiling - open later" -ForegroundColor Yellow
}
if (Wait-HttpOk "http://127.0.0.1:2000/fa/console/login" 30 "admin:2000") {
    Write-Ok "admin :2000"
} else {
    Write-Host "  WARN admin :2000 still compiling - open later" -ForegroundColor Yellow
}

Write-Step "Final verify"
$verify = Join-Path $PSScriptRoot "verify-stack.ps1"
& $verify
if ($LASTEXITCODE -ne 0) {
    Write-Fail "verify-stack failed - video/insurance/services incomplete"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Stack is ready." -ForegroundColor Green
Write-Host "  Site:     http://localhost:4000/fa   (hard refresh Ctrl+F5)" -ForegroundColor Cyan
Write-Host "  CMS:      http://localhost:3000/fa/admin" -ForegroundColor Cyan
Write-Host "  Console:  http://localhost:2000/fa/console" -ForegroundColor Cyan
Write-Host "  Gateway:  http://127.0.0.1:8080/health" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host "Stop apps: .\scripts\stop-apps.ps1" -ForegroundColor DarkGray
Write-Host ""

try {
    while ($true) {
        $parts = @((Get-Date -Format "HH:mm:ss"))
        foreach ($t in @(
            @{ n = "auth"; u = "http://127.0.0.1:5001/health" },
            @{ n = "ins"; u = "http://127.0.0.1:5004/health" },
            @{ n = "blog"; u = "http://127.0.0.1:5005/health" },
            @{ n = "gw"; u = "http://127.0.0.1:8080/health" },
            @{ n = "site"; u = "http://127.0.0.1:4000/fa" }
        )) {
            try {
                $null = Invoke-WebRequest $t.u -UseBasicParsing -TimeoutSec 2
                $parts += ("{0}:OK" -f $t.n)
            } catch {
                $parts += ("{0}:--" -f $t.n)
            }
        }
        Write-Host ($parts -join " | ") -ForegroundColor DarkGray
        Start-Sleep -Seconds 15
    }
} finally {
    Write-Host "Monitor closed - services keep running in background." -ForegroundColor Yellow
    Write-Host "Stop: .\scripts\stop-apps.ps1" -ForegroundColor Yellow
}
