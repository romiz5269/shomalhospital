# Ensure Docker Desktop is up and hospital infra containers are running.
# Safe to re-run: starts existing named containers instead of conflicting compose creates.
$ErrorActionPreference = "Stop"

function Test-DockerReady {
    try {
        $null = docker info 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Ensure-Container {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$ComposeDir,
        [Parameter(Mandatory = $true)][string]$Service
    )

    $exists = docker ps -a --filter "name=^/${Name}$" --format "{{.Names}}" 2>$null
    if ($exists -eq $Name) {
        $running = docker ps --filter "name=^/${Name}$" --format "{{.Names}}" 2>$null
        if ($running -eq $Name) {
            Write-Host ("  {0}: already running" -f $Name) -ForegroundColor Green
            return
        }
        Write-Host ("  {0}: starting existing container..." -f $Name) -ForegroundColor Yellow
        docker start $Name | Out-Null
        return
    }

    Write-Host ("  {0}: creating via compose ({1})..." -f $Name, $Service) -ForegroundColor Cyan
    Push-Location $ComposeDir
    $oldEa = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        docker compose up -d --no-recreate $Service 2>&1 | ForEach-Object { Write-Host $_ }
        # If still missing (project mismatch), force create this service only
        $exists2 = docker ps -a --filter "name=^/${Name}$" --format "{{.Names}}" 2>$null
        if ($exists2 -ne $Name) {
            docker compose up -d $Service 2>&1 | ForEach-Object { Write-Host $_ }
        }
    } finally {
        $ErrorActionPreference = $oldEa
        Pop-Location
    }
}

function Wait-Redis {
    param([int]$Seconds = 40)
    for ($i = 1; $i -le $Seconds; $i++) {
        $ping = docker exec hospital-redis redis-cli ping 2>$null
        if ($ping -match "PONG") { return $true }
        Start-Sleep 1
    }
    return $false
}

function Wait-Postgres {
    param(
        [string]$Container,
        [string]$User,
        [string]$Db,
        [int]$Seconds = 40
    )
    for ($i = 1; $i -le $Seconds; $i++) {
        $out = docker exec $Container pg_isready -U $User -d $Db 2>$null
        if ($out -match "accepting connections") { return $true }
        Start-Sleep 1
    }
    return $false
}

if (-not (Test-DockerReady)) {
    Write-Host "Docker Desktop is not ready. Start Docker Desktop, wait until it is green, then re-run." -ForegroundColor Red
    exit 1
}

Write-Host "Docker: OK" -ForegroundColor Green

$root = Split-Path $PSScriptRoot -Parent
if (-not $root) { $root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path }

$targets = @(
    @{ Name = "hospital-redis"; Dir = (Join-Path $root "auth-service"); Service = "redis" },
    @{ Name = "hospital-postgres-auth"; Dir = (Join-Path $root "auth-service"); Service = "postgres-auth" },
    @{ Name = "hospital-postgres-users"; Dir = (Join-Path $root "users-service"); Service = "postgres-users" },
    @{ Name = "hospital-postgres-appointments"; Dir = (Join-Path $root "appointment-service"); Service = "postgres-appointments" },
    @{ Name = "hospital-postgres-insurance"; Dir = (Join-Path $root "insurance-service"); Service = "postgres-insurance" },
    @{ Name = "hospital-postgres-blog"; Dir = (Join-Path $root "blog-service"); Service = "postgres-blog" }
)

Write-Host "Ensuring infra containers..." -ForegroundColor Cyan
foreach ($t in $targets) {
    Ensure-Container -Name $t.Name -ComposeDir $t.Dir -Service $t.Service
}

Write-Host "Waiting for Redis + Postgres..." -ForegroundColor Cyan
$ok = $true
if (Wait-Redis) {
    Write-Host "  Redis: PONG" -ForegroundColor Green
} else {
    Write-Host "  Redis: FAILED" -ForegroundColor Red
    $ok = $false
}

# Fast TCP check (never use Test-NetConnection — it hangs ~20s on Windows)
try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect("127.0.0.1", 6379, $null, $null)
    $okTcp = $iar.AsyncWaitHandle.WaitOne(1500, $false)
    if ($okTcp -and $client.Connected) {
        Write-Host "  Redis: 127.0.0.1:6379 OK" -ForegroundColor Green
    } else {
        Write-Host "  Redis: 127.0.0.1:6379 not reachable" -ForegroundColor Red
        $ok = $false
    }
    $client.Close()
} catch {
    Write-Host "  Redis: host port check failed" -ForegroundColor Red
    $ok = $false
}

$pgChecks = @(
    @{ C = "hospital-postgres-auth"; U = "auth"; D = "shomal_auth" },
    @{ C = "hospital-postgres-blog"; U = "blog"; D = "shomal_blog" },
    @{ C = "hospital-postgres-users"; U = "users"; D = "shomal_users" },
    @{ C = "hospital-postgres-appointments"; U = "appointments"; D = "shomal_appointments" },
    @{ C = "hospital-postgres-insurance"; U = "insurance"; D = "shomal_insurance" }
)
foreach ($p in $pgChecks) {
    if (Wait-Postgres -Container $p.C -User $p.U -Db $p.D) {
        Write-Host ("  {0}: ready" -f $p.C) -ForegroundColor Green
    } else {
        Write-Host ("  {0}: NOT READY" -f $p.C) -ForegroundColor Red
        $ok = $false
    }
}

if (-not $ok) {
    Write-Host "Infra not healthy. Fix Docker, then re-run this script." -ForegroundColor Red
    exit 1
}

Write-Host "Infra ready." -ForegroundColor Green
exit 0
