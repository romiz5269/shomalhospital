# فقط پورت 5001 را آزاد می‌کند (uvicorn قبلی)
$Port = 5001
$conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $conns) {
    Write-Host "Port $Port is free."
    exit 0
}
foreach ($c in $conns) {
    $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "Killing $($proc.ProcessName) PID $($proc.Id) on port $Port"
        Stop-Process -Id $proc.Id -Force
    }
}
Write-Host "Port $Port freed."
