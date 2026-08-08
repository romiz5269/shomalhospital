# Canonical entry → start-all.ps1 (sequential health-gated startup)
$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "start-all.ps1")
exit $LASTEXITCODE
