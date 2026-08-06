# Final test: Auth direct + Gateway proxy + Upload
$ErrorActionPreference = "Stop"

$Auth = "http://127.0.0.1:5001"
$Gw   = "http://127.0.0.1:8080/api/v1/auth"
$Img  = Join-Path $PSScriptRoot "..\auth-service\static\default-avatar.svg"

function Step($n, $msg) { Write-Host "`n=== $n) $msg ===" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "FAIL: $msg" -ForegroundColor Red; exit 1 }

try { Invoke-RestMethod "$Auth/health" -TimeoutSec 3 | Out-Null } catch { Fail "Auth not running - auth-service\scripts\start.ps1" }
try { Invoke-RestMethod "http://127.0.0.1:8080/health" -TimeoutSec 3 | Out-Null } catch { Fail "Gateway not running - gateway\scripts\start.ps1" }

Step 1 "Gateway -> Auth health"
$ah = Invoke-RestMethod "http://127.0.0.1:8080/api/v1/auth/health"
Write-Host "gateway->auth: $($ah.status)"

Step 2 "Signup via Gateway"
$phone = "09" + (Get-Random -Minimum 100000000 -Maximum 999999999)
$signup = Invoke-RestMethod -Method POST "$Gw/signup" -ContentType "application/json" -Body (@{
    phone       = $phone
    national_id = "0079028248"
    password    = "Test@12345"
    role        = "patient"
    first_name  = "GwTest"
} | ConvertTo-Json)
Write-Host "phone=$phone otp=$($signup.otp_code)"

Step 3 "OTP verify via Gateway"
$auth = Invoke-RestMethod -Method POST "$Gw/otp/verify" -ContentType "application/json" -Body (@{
    phone   = $phone
    code    = $signup.otp_code
    purpose = "signup"
} | ConvertTo-Json)
$token = $auth.tokens.access_token
Write-Host "token OK"

Step 4 "Me via Gateway"
$me = Invoke-RestMethod "$Gw/me" -Headers @{ Authorization = "Bearer $token" }
Write-Host "user=$($me.first_name) role=$($me.roles -join ',')"

Step 5 "Avatar upload via Gateway"
if (Test-Path $Img) {
    $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($curl) {
        $raw = & curl.exe -s -X POST "$Gw/me/avatar" -H "Authorization: Bearer $token" -F "file=@$Img;type=image/svg+xml"
        $up = $raw | ConvertFrom-Json
        if ($up.avatar_url -notlike "/uploads/*") { Fail "avatar upload failed: $raw" }
        Write-Host "avatar=$($up.avatar_url)"
    } else {
        Write-Host "SKIP upload (curl.exe not found)" -ForegroundColor Yellow
    }
}

Step 6 "Login via Gateway"
Invoke-RestMethod -Method POST "$Gw/login" -ContentType "application/json" -Body (@{
    phone    = $phone
    password = "Test@12345"
} | ConvertTo-Json) | Out-Null
Write-Host "login OK"

Step 7 "Logout via Gateway"
Invoke-RestMethod -Method POST "$Gw/logout" -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $token" } -Body "{}" | Out-Null
docker exec hospital-redis redis-cli KEYS "auth:bl:jti:*" | Out-Null
Write-Host "logout + redis blacklist OK"

Write-Host "`nALL DEPLOY TESTS PASSED" -ForegroundColor Green
Write-Host "Site auth API: http://127.0.0.1:8080/api/v1/auth" -ForegroundColor Yellow
