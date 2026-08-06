$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..
$env:Path = "$(Resolve-Path .\.venv\Scripts);$env:Path"

if (-not (Test-Path .\keys\private.pem)) {
  python scripts\generate_keys.py
}

prisma generate
uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload --workers 1
