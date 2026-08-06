# بیمارستان شمال — Production deploy notes (Auth + Users)
# Gateway code is NOT modified by this stack.

## Ports
- Auth:  127.0.0.1:5001
- Users: 127.0.0.1:5002
- Auth DB: 5434 | Users DB: 5435 | Redis: 6379
- Gateway (existing): 8080 → /api/v1/auth/* and /api/v1/users/*

## One-time prepare
```powershell
cd "C:\Users\yasin\Desktop\hospital site"
.\scripts\prepare-prod.ps1
```
Then edit:
- `auth-service/.env.production`
- `users-service/.env.production`
- `.env.prod` (DB/Redis passwords)

## Start (production workers)
Terminal A:
```powershell
cd auth-service
.\scripts\start-prod.ps1
```
Terminal B:
```powershell
cd users-service
.\scripts\start-prod.ps1
```
Terminal C: start gateway as usual (do not change gateway code).

## Must change before go-live
1. DATABASE_URL passwords (not auth_secret / users_secret)
2. REDIS_PASSWORD (same value in auth, users, gateway)
3. SMS_API_KEY — otherwise OTP never reaches phone
4. Admin password (seed default `09000000000` / `Admin@12345`)
5. CORS_ORIGINS = real site domains
6. Sync JWT public key → gateway (`.\scripts\sync-jwt-key.ps1`)
7. Put HTTPS reverse-proxy in front of gateway

## Production safety already in code
- APP_ENV=production → no /docs, no OTP in JSON, no OTP console print
- Gunicorn multi-worker
- Redis JWT blacklist shared with gateway
- Hard delete users requires `?confirm=true`
- Security headers + rate limits (auth)

## Docker images (optional)
```powershell
cd auth-service
docker build -t shomal-auth:1.0 .
cd ../users-service
docker build -t shomal-users:1.0 .
```
Mount `keys/` and `.env.production` at runtime.

## SMS
Implement real provider call in `auth-service/app/services/sms.py` (Kavenegar/Ghasedak).
Until `SMS_API_KEY` is set, OTP is stored hashed but not delivered.
