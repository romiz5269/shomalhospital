# Smoke test blog-service — needs auth (:5001) + blog (:5005)
$ErrorActionPreference = "Stop"

$Auth = "http://127.0.0.1:5001"
$Blog = "http://127.0.0.1:5005"

function Step($n, $msg) { Write-Host "`n=== $n) $msg ===" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "FAIL: $msg" -ForegroundColor Red; exit 1 }

try { Invoke-RestMethod "$Blog/health" -TimeoutSec 3 | Out-Null } catch { Fail "Blog not running - .\scripts\start.ps1" }

Step 1 "Blog health"
$h = Invoke-RestMethod "$Blog/health"
if ($h.status -ne "ok") { Fail "health not ok" }
Write-Host "OK status=$($h.status) service=$($h.service) port=$($h.port)"

Step 2 "Public list (no auth)"
$pub = Invoke-RestMethod "$Blog/public/posts"
if ($pub.total -lt 1) { Fail "expected seeded posts" }
Write-Host "OK total=$($pub.total) first=$($pub.items[0].slug)"

Step 3 "Public get by slug"
$slug = $pub.items[0].slug
$post = Invoke-RestMethod "$Blog/public/posts/$slug"
Write-Host "OK slug=$($post.slug) views=$($post.view_count)"

Step 4 "Admin login (auth)"
try { Invoke-RestMethod "$Auth/health" -TimeoutSec 3 | Out-Null } catch { Fail "Auth not running on 5001" }
$admin = Invoke-RestMethod -Method POST "$Auth/login" -ContentType "application/json" `
    -Body '{"phone":"09000000000","password":"Admin@12345"}'
$adminToken = $admin.tokens.access_token
$H = @{ Authorization = "Bearer $adminToken" }
Write-Host "OK admin id=$($admin.user.id)"

Step 5 "Admin list"
$list = Invoke-RestMethod "$Blog/" -Headers $H
Write-Host "OK admin total=$($list.total)"

Step 6 "Upsert draft post"
$testSlug = "test-post-" + (Get-Random -Minimum 1000 -Maximum 9999)
$created = Invoke-RestMethod -Method POST "$Blog/" -Headers $H -ContentType "application/json" -Body (@{
    slug       = $testSlug
    title_fa   = "Test Post FA"
    title_en   = "Test Post EN"
    is_published = $false
} | ConvertTo-Json)
Write-Host "OK id=$($created.id) slug=$($created.slug)"

Step 7 "Patch + soft delete + hard delete"
$upd = Invoke-RestMethod -Method PATCH "$Blog/$($created.id)" -Headers $H -ContentType "application/json" `
    -Body (@{ is_published = $true; is_featured = $true } | ConvertTo-Json)
Write-Host "OK published=$($upd.is_published)"
Invoke-RestMethod -Method DELETE "$Blog/$($created.id)" -Headers $H | Out-Null
Write-Host "OK soft-delete"
Invoke-RestMethod -Method DELETE "$Blog/$($created.id)/hard?confirm=true" -Headers $H | Out-Null
Write-Host "OK hard-delete"

Write-Host ""
Write-Host "ALL BLOG TESTS PASSED" -ForegroundColor Green
Write-Host "Public:  GET http://127.0.0.1:5005/public/posts"
Write-Host "Gateway: GET/POST http://127.0.0.1:8080/api/v1/pages/... (JWT)"
