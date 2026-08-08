# Verify critical homepage dependencies. Exit 0 = all PASS.
$ErrorActionPreference = "Continue"
$fail = 0

function Check([string]$Name, [scriptblock]$Block) {
    try {
        $ok = & $Block
        if ($ok) {
            Write-Host ("  PASS  {0}" -f $Name) -ForegroundColor Green
            return
        }
    } catch { }
    Write-Host ("  FAIL  {0}" -f $Name) -ForegroundColor Red
    $script:fail++
}

Write-Host "--- verify-stack ---" -ForegroundColor Cyan

Check "auth :5001/health" {
    (Invoke-WebRequest "http://127.0.0.1:5001/health" -UseBasicParsing -TimeoutSec 4).StatusCode -eq 200
}
Check "insurance :5004/health" {
    (Invoke-WebRequest "http://127.0.0.1:5004/health" -UseBasicParsing -TimeoutSec 4).StatusCode -eq 200
}
Check "blog :5005/health" {
    (Invoke-WebRequest "http://127.0.0.1:5005/health" -UseBasicParsing -TimeoutSec 4).StatusCode -eq 200
}
Check "gateway :8080/health" {
    (Invoke-WebRequest "http://127.0.0.1:8080/health" -UseBasicParsing -TimeoutSec 4).StatusCode -eq 200
}
Check "public site :4000/fa" {
    (Invoke-WebRequest "http://127.0.0.1:4000/fa" -UseBasicParsing -TimeoutSec 8).StatusCode -eq 200
}

$hero = $null
Check "CMS hero_video_url non-empty" {
    $site = Invoke-RestMethod "http://127.0.0.1:5005/public/site" -TimeoutSec 8
    $script:hero = $site.hero_video_url
    [bool]$site.hero_video_url
}
if ($hero) {
    Write-Host ("         hero = {0}" -f $hero) -ForegroundColor DarkGray
}

Check "blog video file HTTP 200" {
    if (-not $hero) { return $false }
    $u = $hero
    if ($u.StartsWith("/")) { $u = "http://127.0.0.1:5005$u" }
    (Invoke-WebRequest $u -Method Head -UseBasicParsing -TimeoutSec 8).StatusCode -eq 200
}

$proxyPath = $null
if ($hero -and $hero -match "/uploads/(.+)$") {
    $proxyPath = "/cms-media/uploads/$($Matches[1].Split('?')[0])"
}
Check "same-origin :4000/cms-media video 200" {
    if (-not $proxyPath) { return $false }
    $u = "http://127.0.0.1:4000$proxyPath"
    Write-Host ("         proxy = {0}" -f $u) -ForegroundColor DarkGray
    (Invoke-WebRequest $u -Method Head -UseBasicParsing -TimeoutSec 10).StatusCode -eq 200
}

Check "homepage HTML has video + cms-media" {
    $html = (Invoke-WebRequest "http://127.0.0.1:4000/fa" -UseBasicParsing -TimeoutSec 15).Content
    ($html -match "<video") -and ($html -match "/cms-media/uploads/")
}

$insCount = 0
$withLogo = 0
Check "insurance API count > 0 with logos" {
    $items = Invoke-RestMethod "http://127.0.0.1:5004/public" -TimeoutSec 8
    $script:insCount = @($items).Count
    $script:withLogo = @($items | Where-Object { $_.logo_url }).Count
    Write-Host ("         insurances={0} with_logo={1}" -f $insCount, $withLogo) -ForegroundColor DarkGray
    ($insCount -gt 0) -and ($withLogo -gt 0)
}

Check "insurance logo URL fetchable (first)" {
    $items = Invoke-RestMethod "http://127.0.0.1:5004/public" -TimeoutSec 8
    $logo = ($items | Select-Object -First 1).logo_url
    if (-not $logo) { return $false }
    if ($logo.StartsWith("/")) {
        $logo = "http://127.0.0.1:4000$logo"
    }
    Write-Host ("         sample_logo = {0}" -f $logo) -ForegroundColor DarkGray
    (Invoke-WebRequest $logo -Method Head -UseBasicParsing -TimeoutSec 8).StatusCode -eq 200
}

Write-Host ""
if ($fail -gt 0) {
    Write-Host ("VERIFY FAILED - {0} check(s)" -f $fail) -ForegroundColor Red
    exit 1
}
Write-Host "VERIFY PASS - video + insurance + services OK" -ForegroundColor Green
exit 0
