# Interactive test - login needs ONLY phone + password (no national ID)
$ErrorActionPreference = "Stop"

$UseGateway = $env:USE_GATEWAY -eq "1"
if ($UseGateway) {
    $Base = "http://127.0.0.1:8080/api/v1/auth"
    Write-Host "Mode: SITE (gateway -> auth:5001)" -ForegroundColor Magenta
} else {
    $Base = "http://127.0.0.1:5001"
    Write-Host "Mode: DIRECT auth port 5001" -ForegroundColor Magenta
}

$script:Token = $null
$script:Phone = $null

function Check-Health {
    if ($UseGateway) {
        $healthUrl = "http://127.0.0.1:5001/health"
    } else {
        $healthUrl = "$Base/health"
    }

    $lastError = $null
    for ($i = 1; $i -le 10; $i++) {
        try {
            if ($UseGateway -and $i -eq 1) {
                Invoke-RestMethod "http://127.0.0.1:8080/health" -TimeoutSec 5 | Out-Null
            }
            $h = Invoke-RestMethod $healthUrl -TimeoutSec 5
            Write-Host "Auth OK (5001): $($h.status)" -ForegroundColor Green
            return $true
        }
        catch {
            $lastError = $_.Exception.Message
            if ($i -lt 10) {
                Write-Host "Waiting for auth... ($i/10)" -ForegroundColor DarkYellow
                Start-Sleep -Seconds 2
            }
        }
    }

    Write-Host "Auth DOWN - could not reach $healthUrl" -ForegroundColor Red
    Write-Host "Error: $lastError" -ForegroundColor Red
    Write-Host "Fix: open a SECOND terminal and run .\scripts\start.ps1 (keep it open)" -ForegroundColor Yellow
    return $false
}

function Show-Menu {
    Write-Host ""
    Write-Host "Flow: 4 signup -> 5 OTP -> 1 login  |  SAME phone always"
    Write-Host "OTP: read the REAL code from the start.ps1 terminal (6 digits)"
    Write-Host ""
    Write-Host "--- LOGIN (no national ID) ---"
    Write-Host "1 - Login with password (phone + password)"
    Write-Host "2 - Login with OTP (phone + code from start.ps1)"
    Write-Host "3 - Admin login"
    Write-Host "--- SIGNUP ---"
    Write-Host "4 - Signup patient (phone + password, national ID optional)"
    Write-Host "5 - Verify signup OTP (code from start.ps1)"
    Write-Host "--- PROFILE ---"
    Write-Host "6 - My profile (/me)"
    Write-Host "7 - Set national ID (after login, optional)"
    Write-Host "8 - Logout"
    Write-Host "0 - Exit"
    return Read-Host "Choose"
}

Write-Host ""
Write-Host "========== Hospital Auth Test ==========" -ForegroundColor Cyan
Write-Host "API base: $Base"
Write-Host "Auth service always runs on port 5001"
Write-Host ""

if (-not (Check-Health)) {
    exit 1
}

while ($true) {
    $choice = Show-Menu
    switch ($choice) {
        "1" {
            $script:Phone = Read-Host "Phone"
            $pass = Read-Host "Password"
            $body = @{ phone = $script:Phone; password = $pass } | ConvertTo-Json -Compress
            try {
                $r = Invoke-RestMethod -Method POST "$Base/login" -ContentType "application/json; charset=utf-8" -Body $body
                $script:Token = $r.tokens.access_token
                Write-Host "Login OK | role=$($r.user.roles -join ',')" -ForegroundColor Green
            }
            catch {
                Write-Host $_.ErrorDetails.Message -ForegroundColor Red
            }
        }
        "2" {
            $script:Phone = Read-Host "Phone"
            try {
                $reqBody = @{ phone = $script:Phone; purpose = "login" } | ConvertTo-Json
                $req = Invoke-RestMethod -Method POST "$Base/otp/request" -ContentType "application/json" -Body $reqBody
                Write-Host $req.message
                if ($req.otp_code) {
                    Write-Host "OTP (dev): $($req.otp_code)" -ForegroundColor Yellow
                }
                else {
                    Write-Host "No OTP code returned." -ForegroundColor Yellow
                    Write-Host "Usually means this phone is NOT registered yet." -ForegroundColor Yellow
                    Write-Host "Do: 4 Signup with THIS phone, then 5 with OTP 1000, then login." -ForegroundColor Yellow
                    continue
                }
                $code = Read-Host "OTP code (from start.ps1 terminal)"
                $verifyBody = @{ phone = $script:Phone; code = $code; purpose = "login" } | ConvertTo-Json
                $r = Invoke-RestMethod -Method POST "$Base/otp/verify" -ContentType "application/json" -Body $verifyBody
                $script:Token = $r.tokens.access_token
                Write-Host "OTP login OK" -ForegroundColor Green
            }
            catch {
                Write-Host $_.ErrorDetails.Message -ForegroundColor Red
            }
        }
        "3" {
            try {
                $r = Invoke-RestMethod -Method POST "$Base/login" -ContentType "application/json" -Body '{"phone":"09000000000","password":"Admin@12345"}'
                $script:Token = $r.tokens.access_token
                Write-Host "Admin OK" -ForegroundColor Green
            }
            catch {
                Write-Host $_.ErrorDetails.Message -ForegroundColor Red
            }
        }
        "4" {
            $script:Phone = Read-Host "Phone"
            $pass = Read-Host "Password"
            $first = Read-Host "First name"
            $nid = Read-Host "National ID (Enter = skip)"
            $payload = @{
                phone      = $script:Phone
                password   = $pass
                role       = "patient"
                first_name = $first
            }
            if ($nid.Trim()) {
                $payload.national_id = $nid.Trim()
            }
            try {
                $signupBody = $payload | ConvertTo-Json -Compress
                $r = Invoke-RestMethod -Method POST "$Base/signup" -ContentType "application/json" -Body $signupBody
                if ($r.auto_login) {
                    $script:Token = $r.tokens.access_token
                    Write-Host "Auto-login OK" -ForegroundColor Green
                }
                else {
                    Write-Host $r.message -ForegroundColor Green
                    if ($r.otp_code) {
                        Write-Host "OTP (dev): $($r.otp_code)" -ForegroundColor Yellow
                    }
                    Write-Host "NEXT: look at start.ps1 terminal for OTP, then choose 5" -ForegroundColor Yellow
                }
            }
            catch {
                Write-Host $_.ErrorDetails.Message -ForegroundColor Red
            }
        }
        "5" {
            if (-not $script:Phone) {
                $script:Phone = Read-Host "Phone"
            }
            else {
                Write-Host "Phone (saved): $script:Phone"
            }
            $code = Read-Host "OTP code (from start.ps1 terminal)"
            try {
                $verifyBody = @{ phone = $script:Phone; code = $code; purpose = "signup" } | ConvertTo-Json
                $r = Invoke-RestMethod -Method POST "$Base/otp/verify" -ContentType "application/json" -Body $verifyBody
                $script:Token = $r.tokens.access_token
                Write-Host "Verified OK" -ForegroundColor Green
            }
            catch {
                Write-Host $_.ErrorDetails.Message -ForegroundColor Red
            }
        }
        "6" {
            if (-not $script:Token) {
                Write-Host "Login first (option 1 or 2)" -ForegroundColor Yellow
                continue
            }
            try {
                Invoke-RestMethod "$Base/me" -Headers @{ Authorization = "Bearer $script:Token" } | ConvertTo-Json -Depth 4
            }
            catch {
                Write-Host $_.ErrorDetails.Message -ForegroundColor Red
            }
        }
        "7" {
            if (-not $script:Token) {
                Write-Host "Login first" -ForegroundColor Yellow
                continue
            }
            $nid = Read-Host "National ID (valid 10 digits)"
            try {
                $patchBody = @{ national_id = $nid } | ConvertTo-Json
                $r = Invoke-RestMethod -Method PATCH "$Base/me/national-id" -ContentType "application/json" -Headers @{ Authorization = "Bearer $script:Token" } -Body $patchBody
                Write-Host "National ID set: $($r.national_id)" -ForegroundColor Green
            }
            catch {
                Write-Host $_.ErrorDetails.Message -ForegroundColor Red
            }
        }
        "8" {
            if (-not $script:Token) {
                continue
            }
            try {
                Invoke-RestMethod -Method POST "$Base/logout" -ContentType "application/json" -Headers @{ Authorization = "Bearer $script:Token" } -Body "{}" | Out-Null
                $script:Token = $null
                Write-Host "Logged out" -ForegroundColor Green
            }
            catch {
                Write-Host $_.ErrorDetails.Message -ForegroundColor Red
            }
        }
        "0" {
            break
        }
        default {
            Write-Host "Invalid choice" -ForegroundColor Yellow
        }
    }
}
