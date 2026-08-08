# Stop app listeners; leave Docker Redis/Postgres running.
$ErrorActionPreference = "Continue"
Write-Host "Stopping app ports..." -ForegroundColor Yellow

# Kill stuck gateway/tsx zombies first (they freeze :8080 restarts)
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
        $_.CommandLine -and (
            $_.CommandLine -match 'hospital site\\gateway' -or
            $_.CommandLine -match 'hospital site/gateway' -or
            ($_.CommandLine -match 'tsx' -and $_.CommandLine -match 'server\.ts')
        )
    } |
    ForEach-Object {
        cmd /c "taskkill /F /T /PID $($_.ProcessId)" 2>$null | Out-Null
        Write-Host ("  killed gateway zombie PID {0}" -f $_.ProcessId)
    }

foreach ($port in 2000, 3000, 4000, 5001, 5002, 5003, 5004, 5005, 8080) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        $procId = $c.OwningProcess
        if ($procId -and $procId -ne 0) {
            cmd /c "taskkill /F /T /PID $procId" 2>$null | Out-Null
            Write-Host ("  killed :{0} PID {1}" -f $port, $procId)
        }
    }
}
Write-Host "Done. Docker containers still running." -ForegroundColor Green
Write-Host "Redis check: docker exec hospital-redis redis-cli ping" -ForegroundColor DarkGray
