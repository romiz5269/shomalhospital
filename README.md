# سامانه تیکتینگ بیمارستان (شمال / Hospital Ticketing)

سیستم ثبت و مدیریت درخواست‌های پشتیبانی کارکنان بیمارستان.

| سرویس | تکنولوژی | پورت |
|--------|-----------|------|
| API | FastAPI + Uvicorn + SQLAlchemy + Socket.IO | `4000` |
| پورتال کارکنان | Next.js | `3000` |
| پنل ادمین | Next.js | `3001` |
| دیتابیس | PostgreSQL 16 (Docker) | `5434` |
| کش | Redis 7 (Docker) | `6379` |

> ریپوی GitHub: [romiz5269/shomalhospital](https://github.com/romiz5269/shomalhospital) — برنچ `tiketing`

---

## کلون از گیتهاب

```bash
git clone -b tiketing https://github.com/romiz5269/shomalhospital.git
cd shomalhospital
```

اگر ریپو از قبل کلون شده:

```bash
git fetch origin
git checkout tiketing
```

---

## پیش‌نیازها

- **Node.js 18+** و npm
- **Python 3.11+**
- **Docker Desktop** (روشن باشد)

---

## راه‌اندازی از صفر (ویندوز / PowerShell)

از ریشه پروژه (`shomalhospital` یا `tiket`):

### ۱) وابستگی‌های ریشه و فرانت‌ها

```powershell
npm install
npm run install:all
```

### ۲) محیط مجازی پایتون و پکیج‌های بک‌اند

```powershell
npm run install:backend
```

یا دستی:

```powershell
python -m venv backend\.venv
backend\.venv\Scripts\python -m pip install -r backend\requirements.txt
```

### ۳) فایل‌های `.env`

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
Copy-Item admin\.env.example admin\.env
```

مقادیر پیش‌فرض با `docker-compose.yml` هماهنگ است.

### ۴) بالا آوردن Postgres + Redis

```powershell
docker compose up -d
```

صبر کنید تا healthy شوند:

```powershell
docker compose ps
```

### ۵) ساخت جداول

```powershell
npm run db:push
```

### ۶) اجرای همه سرویس‌ها

```powershell
npm run dev
```

این دستور به‌ترتیب: DB را بالا می‌آورد، صبر می‌کند، schema را می‌سازد، سپس API + Staff + Admin را با هم اجرا می‌کند.

---

## آدرس‌ها بعد از اجرا

| سرویس | URL |
|--------|-----|
| کارکنان | http://localhost:3000 |
| ادمین | http://localhost:3001 |
| API Health | http://localhost:4000/api/health |
| Docs (Swagger) | http://localhost:4000/docs |

### اولین استفاده

1. http://localhost:3000/register → حساب کارکنان بسازید  
   (رمز حداقل ۸ کاراکتر، ترکیبی از حروف و عدد — مثلاً `Pass12345`)
2. http://localhost:3001/register → حساب ادمین بسازید
3. در پنل کارکنان تیکت بسازید؛ در ادمین ببینید، پاسخ دهید، وضعیت عوض کنید

---

## ساختار پوشه‌ها

```
├── backend/          # FastAPI (Python)
│   ├── app/          # کد اصلی API
│   ├── scripts/      # استرس‌تست
│   ├── requirements.txt
│   └── .env.example
├── frontend/         # پورتال کارکنان (Next.js :3000)
├── admin/            # پنل ادمین (Next.js :3001)
├── docker-compose.yml
├── package.json      # concurrently + اسکریپت‌های کمکی
├── README.md
└── DEPLOY.md
```

---

## اسکریپت‌های مفید

```powershell
npm run dev          # اجرا کامل توسعه
npm run db:up        # فقط Docker (Postgres+Redis)
npm run db:down      # خاموش کردن Docker
npm run db:push      # ساخت/همگام schema
npm run stress       # تست بار هر دو پنل (API باید بالا باشد)
```

API Production-ish (چند worker — Redis لازم است):

```powershell
cd backend
npm run start
```

---

## مشخصات دیتابیس پیش‌فرض (Docker)

| مورد | مقدار |
|------|--------|
| Host | `localhost` |
| Port | `5434` |
| DB | `hospital_tickets` |
| User | `ticket_admin` |
| Password | `HspDb_7nQ4wR9xK2mP5vL8` |

```
postgresql://ticket_admin:HspDb_7nQ4wR9xK2mP5vL8@localhost:5434/hospital_tickets
```

> برای پروداکشن رمزها را عوض کنید. هرگز `docker compose down -v` را بی‌دلیل نزنید — volume دیتابیس پاک می‌شود.

---

## APIهای اصلی

| مسیر | نقش |
|------|------|
| `/api/staff-auth/*` | ثبت‌نام / لاگین / me کارکنان |
| `/api/auth/*` | ثبت‌نام / لاگین / me ادمین |
| `/api/staff/tickets/*` | تیکت‌های کارکنان |
| `/api/tickets/*` | تیکت‌های ادمین (+ مهمان) |
| Socket.IO | رویدادهای realtime تیکت |

---

## عیب‌یابی

| مشکل | کار |
|------|-----|
| `EADDRINUSE :3000/:3001/:4000` | پروسه‌های قبلی را ببندید (Ctrl+C) یا پورت را آزاد کنید |
| `Can't reach database` | `docker compose up -d` و Docker Desktop روشن |
| `Authentication failed` (DB) | `backend/.env` را با `docker-compose.yml` یکسان کنید |
| رمز رد می‌شود | حداقل ۸ کاراکتر + حرف و عدد |
| CORS | `CORS_ORIGIN` شامل `3000` و `3001` باشد |

---

## استقرار سرور

جزئیات در [`DEPLOY.md`](./DEPLOY.md).

---

## نکات Git

- `node_modules/` و `backend/.venv/` و `.env` در ریپو نیستند (عمداً سنگین/حساس).
- بعد از کلون همیشه `npm install` + `npm run install:all` + `npm run install:backend` را بزنید.
