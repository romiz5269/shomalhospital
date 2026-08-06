# Smoke test users-service — needs auth (:5001) + users (:5002)
# Console output is ASCII-only (Windows PowerShell mangled Persian).
$ErrorActionPreference = "Stop"

$Auth = "http://127.0.0.1:5001"
$Users = "http://127.0.0.1:5002"

function Step($n, $msg) { Write-Host "`n=== $n) $msg ===" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "FAIL: $msg" -ForegroundColor Red; exit 1 }

try { Invoke-RestMethod "$Auth/health" -TimeoutSec 3 | Out-Null } catch { Fail "Auth not running on 5001" }
try { Invoke-RestMethod "$Users/health" -TimeoutSec 3 | Out-Null } catch { Fail "Users not running - .\scripts\start.ps1" }

Step 1 "Users health"
$h = Invoke-RestMethod "$Users/health"
if ($h.status -ne "ok") { Fail "health not ok" }
Write-Host "OK status=$($h.status) service=$($h.service) port=$($h.port)"

Step 2 "Admin login (auth)"
$admin = Invoke-RestMethod -Method POST "$Auth/login" -ContentType "application/json" `
    -Body '{"phone":"09000000000","password":"Admin@12345"}'
$adminToken = $admin.tokens.access_token
$H = @{ Authorization = "Bearer $adminToken" }
Write-Host "OK admin id=$($admin.user.id)"

Step 3 "Admin /me"
$me = Invoke-RestMethod "$Users/me" -Headers $H
Write-Host "OK file=$($me.file_number) phone=$($me.phone)"

Step 4 "List departments"
$deps = Invoke-RestMethod "$Users/departments" -Headers $H
$firstEn = $deps[0].name_en
if (-not $firstEn) { $firstEn = $deps[0].code }
Write-Host "OK count=$($deps.Count) first=$firstEn"

Step 5 "Create patient profile"
$phone = "09" + (Get-Random -Minimum 100000000 -Maximum 999999999)
$signup = Invoke-RestMethod -Method POST "$Auth/signup" -ContentType "application/json" -Body (@{
    phone = $phone; password = "Test@12345"; role = "patient"; first_name = "Patient"
} | ConvertTo-Json)
$verified = Invoke-RestMethod -Method POST "$Auth/otp/verify" -ContentType "application/json" -Body (@{
    phone = $phone; code = $signup.otp_code; purpose = "signup"
} | ConvertTo-Json)
$authUserId = $verified.user.id

$created = Invoke-RestMethod -Method POST "$Users/" -Headers $H -ContentType "application/json" -Body (@{
    auth_user_id    = $authUserId
    phone           = $phone
    first_name      = "Ali"
    last_name       = "Rezaei"
    father_name     = "Mohammad"
    person_type     = "patient"
    gender          = "male"
    blood_type      = "A+"
    insurance_type  = "tamin"
    city            = "Sari"
    province        = "Mazandaran"
    department_id   = $deps[0].id
} | ConvertTo-Json)
Write-Host "OK id=$($created.id) file=$($created.file_number)"

Step 6 "List users"
$list = Invoke-RestMethod "$Users/?q=Ali" -Headers $H
Write-Host "OK total=$($list.total)"

Step 7 "Get + update + note"
$one = Invoke-RestMethod "$Users/$($created.id)" -Headers $H
Write-Host "OK get phone=$($one.phone)"
$upd = Invoke-RestMethod -Method PATCH "$Users/$($created.id)" -Headers $H -ContentType "application/json" `
    -Body (@{ job_title = "Outpatient"; notes = "ER admission" } | ConvertTo-Json)
Write-Host "OK notes=$($upd.notes)"
Invoke-RestMethod -Method POST "$Users/$($created.id)/notes" -Headers $H -ContentType "application/json" `
    -Body (@{ body = "Initial visit done" } | ConvertTo-Json) | Out-Null
Write-Host "OK note added"

Step 8 "Soft delete then hard delete"
Invoke-RestMethod -Method DELETE "$Users/$($created.id)" -Headers $H | Out-Null
Write-Host "OK soft-delete"
Invoke-RestMethod -Method DELETE "$Users/$($created.id)/hard?confirm=true" -Headers $H | Out-Null
Write-Host "OK hard-delete"

Write-Host ""
Write-Host "ALL USERS TESTS PASSED" -ForegroundColor Green
Write-Host "Gateway soft: DELETE /api/v1/users/{id}"
Write-Host "Gateway hard: DELETE /api/v1/users/{id}/hard?confirm=true"
