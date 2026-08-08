# Shared helpers: Docker writes progress to stderr; with $ErrorActionPreference=Stop
# that aborts start.ps1 before uvicorn ever runs — homepage then has no CMS video.
function Invoke-DockerSafe {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$DockerArgs
    )
    $old = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & docker @DockerArgs 2>&1 | ForEach-Object {
            if ($_ -is [System.Management.Automation.ErrorRecord]) {
                Write-Host $_.ToString()
            } else {
                Write-Host $_
            }
        }
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $old
    }
}

function Ensure-InfraContainer {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string[]]$ComposeUpArgs
    )
    $old = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $running = docker ps --filter "name=^/${Name}$" --format "{{.Names}}" 2>$null
        if ($running -eq $Name) {
            Write-Host ("  {0}: already running" -f $Name) -ForegroundColor Green
            return $true
        }
        $exists = docker ps -a --filter "name=^/${Name}$" --format "{{.Names}}" 2>$null
        if ($exists -eq $Name) {
            Write-Host ("  {0}: starting..." -f $Name) -ForegroundColor Yellow
            $null = docker start $Name 2>&1
            return ($LASTEXITCODE -eq 0)
        }
        Write-Host ("  {0}: compose create..." -f $Name) -ForegroundColor Cyan
        $null = docker compose @ComposeUpArgs 2>&1
        return ($LASTEXITCODE -eq 0)
    } finally {
        $ErrorActionPreference = $old
    }
}
