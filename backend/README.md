# Backend — FastAPI

## Dev

```powershell
# from repo root
Copy-Item .env.example .env   # once
npm run db:push
npm run dev
```

## Production-ish (multi-worker)

```powershell
npm run start
```

Needs Redis up for Socket.IO across workers.

## Health

`GET http://localhost:4000/api/health`

## Stress test (API must be running)

From repo root:

```powershell
npm run stress
```
