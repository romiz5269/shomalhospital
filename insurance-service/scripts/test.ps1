# Smoke test insurance-service — needs auth (:5001) + insurance (:5004)
# Console output is ASCII-only (Windows PowerShell mangled Persian).
$ErrorActionPreference = "Stop"

$Auth = "http://127.0.0.1:5001"
$Insurance = "http://127.0.0.1:5004"

function Step($n, $msg) { Write-Host "`n=== $n) $msg ===" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "FAIL: $msg" -ForegroundColor Red; exit 1 }

try { Invoke-RestMethod "$Insurance/health" -TimeoutSec 3 | Out-Null } catch { Fail "Insurance not running - .\scripts\start.ps1" }

Step 1 "Insurance health"
$h = Invoke-RestMethod "$Insurance/health"
if ($h.status -ne "ok") { Fail "health not ok" }
Write-Host "OK status=$($h.status) service=$($h.service) port=$($h.port)"

Step 2 "Public featured carousel"
$featured = Invoke-RestMethod "$Insurance/public"
if ($featured.Count -lt 1) { Fail "no featured insurances seeded" }
Write-Host "OK featured count=$($featured.Count) first=$($featured[0].code)"

Step 3 "Public all active"
$all = Invoke-RestMethod "$Insurance/public/all"
Write-Host "OK active count=$($all.Count)"

Step 4 "Admin login (auth)"
try { Invoke-RestMethod "$Auth/health" -TimeoutSec 3 | Out-Null } catch { Fail "Auth not running on 5001" }
$admin = Invoke-RestMethod -Method POST "$Auth/login" -ContentType "application/json" `
    -Body '{"phone":"09000000000","password":"Admin@12345"}'
$adminToken = $admin.tokens.access_token
$H = @{ Authorization = "Bearer $adminToken" }
Write-Host "OK admin id=$($admin.user.id)"

Step 5 "Admin list"
$list = Invoke-RestMethod "$Insurance/" -Headers $H
Write-Host "OK admin list count=$($list.Count)"

Step 6 "Upsert test provider"
$code = "test-" + (Get-Random -Minimum 1000 -Maximum 9999)
$created = Invoke-RestMethod -Method POST "$Insurance/" -Headers $H -ContentType "application/json" -Body (@{
    code       = $code
    name_fa    = "Test Insurance"
    name_en    = "Test Insurance Co"
    sort_order = 99
    is_active  = $true
    is_featured = $false
} | ConvertTo-Json)
Write-Host "OK created id=$($created.id) code=$($created.code)"

Step 7 "Get + patch"
$one = Invoke-RestMethod "$Insurance/$($created.id)" -Headers $H
Write-Host "OK get code=$($one.code)"
$upd = Invoke-RestMethod -Method PATCH "$Insurance/$($created.id)" -Headers $H -ContentType "application/json" `
    -Body (@{ is_featured = $true; sort_order = 50 } | ConvertTo-Json)
Write-Host "OK patched featured=$($upd.is_featured)"

Step 8 "Soft delete then hard delete"
Invoke-RestMethod -Method DELETE "$Insurance/$($created.id)" -Headers $H | Out-Null
Write-Host "OK soft-delete"
Invoke-RestMethod -Method DELETE "$Insurance/$($created.id)/hard?confirm=true" -Headers $H | Out-Null
Write-Host "OK hard-delete"

Write-Host ""
Write-Host "ALL INSURANCE TESTS PASSED" -ForegroundColor Green
Write-Host "Gateway public: GET /api/v1/insurance/public"
Write-Host "Gateway admin:  GET /api/v1/insurance/ (JWT admin)"
