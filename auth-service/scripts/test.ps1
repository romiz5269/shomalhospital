# تست کامل Auth — اول start.ps1 را در ترمینال دیگر اجرا کن
$ErrorActionPreference = "Stop"
$Base = "http://127.0.0.1:5001"

function Step($n, $msg) { Write-Host "`n=== $n) $msg ===" -ForegroundColor Cyan }

Write-Host "Checking Auth server..." -ForegroundColor Cyan
try {
    $null = Invoke-RestMethod "$Base/health" -TimeoutSec 3
} catch {
    Write-Host ""
    Write-Host "Auth is NOT running on $Base" -ForegroundColor Red
    Write-Host "Open another terminal and run:" -ForegroundColor Yellow
    Write-Host "  cd `"$PSScriptRoot\..`"" -ForegroundColor White
    Write-Host "  .\scripts\start.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

Step 1 "Health"
$h = Invoke-RestMethod "$Base/health"
Write-Host ($h | ConvertTo-Json)

Step 2 "Signup patient"
$phone = "09" + (Get-Random -Minimum 100000000 -Maximum 999999999)
$body = @{
    phone       = $phone
    national_id = "0013542419"
    password    = "Test@12345"
    role        = "patient"
    first_name  = "Test"
} | ConvertTo-Json
$signup = Invoke-RestMethod -Method POST "$Base/signup" -ContentType "application/json" -Body $body
Write-Host "phone=$phone otp=$($signup.otp_code)"

Step 3 "OTP verify"
$auth = Invoke-RestMethod -Method POST "$Base/otp/verify" -ContentType "application/json" -Body (@{
    phone   = $phone
    code    = $signup.otp_code
    purpose = "signup"
} | ConvertTo-Json)
$token = $auth.tokens.access_token
Write-Host "access_token OK | expires_in=$($auth.tokens.expires_in)"

Step 4 "Me"
$me = Invoke-RestMethod "$Base/me" -Headers @{ Authorization = "Bearer $token" }
Write-Host "user=$($me.first_name) roles=$($me.roles -join ',') national_id=$($me.national_id)"

Step 5 "Login password"
$login = Invoke-RestMethod -Method POST "$Base/login" -ContentType "application/json" -Body (@{
    phone    = $phone
    password = "Test@12345"
} | ConvertTo-Json)
Write-Host "login OK"

Step 6 "Auto-login (duplicate signup)"
$again = Invoke-RestMethod -Method POST "$Base/signup" -ContentType "application/json" -Body $body
Write-Host "auto_login=$($again.auto_login)"

Step 7 "Logout + Redis blacklist"
$logout = Invoke-RestMethod -Method POST "$Base/logout" -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $token" } -Body "{}"
$keys = docker exec hospital-redis redis-cli KEYS "auth:bl:jti:*"
Write-Host "blacklist keys: $keys"

Step 8 "Admin login"
$admin = Invoke-RestMethod -Method POST "$Base/login" -ContentType "application/json" -Body '{"phone":"09000000000","password":"Admin@12345"}'
Write-Host "admin role=$($admin.user.roles -join ',')"

Write-Host "`nALL TESTS PASSED" -ForegroundColor Green
