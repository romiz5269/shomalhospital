# راهنمای نصب از صفر — بیمارستان شمال (Shomal Hospital)

این سند برای راه‌اندازی کامل پروژه روی ویندوز است: دیتابیس‌ها، Redis، کتابخانه‌ها، seed و اجرای استک.

---

## 1. پیش‌نیازها

| ابزار | نسخه | کاربرد |
|--------|------|--------|
| Windows 10/11 | — | توسعه محلی |
| Docker Desktop | آخرین | 5x Postgres + Redis |
| Python | 3.11+ | میکروسرویس‌های FastAPI |
| Node.js | 20 LTS+ | Gateway + Next.js |
| PowerShell | 5.1+ / 7+ | اسکریپت‌های استارت |
| Git | — | کلون / پوش |

قبل از هر چیز **Docker Desktop را روشن** کنید تا سبز شود.

---

## 2. کلون پروژه

```powershell
git clone https://github.com/romiz5269/shomalhospital.git
cd shomalhospital
git checkout develop
```

`node_modules` و `.venv` داخل گیت نیستند؛ باید محلی نصب شوند.

---

## 3. دیتابیس‌ها و Redis (Docker)

هر سرویس Postgres جدا دارد + یک Redis مشترک.

| Container | پورت host | DB / User | سرویس |
|-----------|-----------|-----------|--------|
| `hospital-postgres-auth` | `5434` | `shomal_auth` / `auth` | auth-service |
| `hospital-postgres-users` | `5435` | `shomal_users` / `users` | users-service |
| `hospital-postgres-appointments` | `5436` | `shomal_appointments` / `appointments` | appointment |
| `hospital-postgres-insurance` | `5437` | `shomal_insurance` / `insurance` | insurance |
| `hospital-postgres-blog` | `5438` | `shomal_blog` / `blog` | blog/CMS |
| `hospital-redis` | `6379` | — | auth + gateway (blacklist JWT) |

### استارت زیرساخت (پیشنهادی)

```powershell
cd "C:\path\to\hospital site"
.\scripts\ensure-docker.ps1
```

این اسکریپت کانتینرهای موجود را reuse می‌کند (بدون conflict نام) و منتظر `PONG` Redis و `pg_isready` می‌ماند.

### دستی (در صورت نیاز)

```powershell
# از ریشه یا داخل هر سرویس:
cd auth-service; docker compose up -d postgres-auth redis
cd ..\users-service; docker compose up -d postgres-users
cd ..\appointment-service; docker compose up -d postgres-appointments
cd ..\insurance-service; docker compose up -d postgres-insurance
cd ..\blog-service; docker compose up -d postgres-blog
```

اگر خطای `container name already in use` دیدید:

```powershell
docker start hospital-redis hospital-postgres-auth hospital-postgres-users hospital-postgres-appointments hospital-postgres-insurance hospital-postgres-blog
```

### اتصال نمونه (Auth)

```
postgresql://auth:auth_secret@127.0.0.1:5434/shomal_auth
```

رمزهای پیش‌فرض فقط برای توسعه محلی‌اند؛ برای پروداکشن عوض شوند (نگاه کنید به `PRODUCTION.md`).

Prisma migrate/generate معمولاً در `scripts/start.ps1` هر سرویس یا هنگام اولین اجرا انجام می‌شود.

---

## 4. کتابخانه‌ها و محیط Python

هر سرویس Python ویندوز: `.venv` جدا.

```powershell
# نمونه برای auth-service (بقیه مشابه)
cd auth-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Prisma client
npx prisma generate   # یا دستور داخل start.ps1 سرویس
Copy-Item .env.example .env -ErrorAction SilentlyContinue
```

سرویس‌ها:

| پوشه | پورت | پکیج اصلی |
|------|------|-----------|
| `auth-service` | 5001 | FastAPI, Prisma, Redis, JWT RS256 |
| `users-service` | 5002 | FastAPI, Prisma |
| `appointment-service` | 5003 | FastAPI, Prisma |
| `insurance-service` | 5004 | FastAPI, Prisma |
| `blog-service` | 5005 | FastAPI, Prisma, آپلود مدیا |

JWT: کلیدها در `auth-service/keys/` ساخته می‌شوند. public key با:

```powershell
.\scripts\sync-jwt-key.ps1
```

به `gateway/.env` کپی می‌شود.

### Seed ادمین / RBAC

```powershell
cd auth-service
.\.venv\Scripts\python.exe scripts\seed_rbac.py
.\.venv\Scripts\python.exe scripts\seed_admin.py 09000000000 Admin@12345
```

---

## 5. کتابخانه‌ها — Node (Gateway + Frontend)

### Gateway

```powershell
cd gateway
npm install
Copy-Item .env.example .env -ErrorAction SilentlyContinue
# یا sync JWT از اسکریپت ریشه
```

متغیر مهم محلی:

```
ENABLE_OPTIONAL_PROVIDERS=false
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

با `false`، Kafka/MinIO/Prisma گیت‌وی رد می‌شوند و استارت سریع است (فقط Redis اجباری).

### Frontend (Next.js 16)

```powershell
cd frontend
npm install
Copy-Item .env.local.example .env.local -ErrorAction SilentlyContinue
```

سه پورت جدا با `NEXT_DIST_DIR` جدا:

| پورت | اسکریپت npm | نقش |
|------|-------------|-----|
| 4000 | `dev:public` | سایت عمومی |
| 3000 | `dev:cms` | CMS / صفحه‌ساز |
| 2000 | `dev:admin` | کنسول سیستم |

---

## 6. اجرای یک‌کلیکی کل استک

از ریشه پروژه:

```powershell
.\scripts\ensure-docker.ps1
.\scripts\run-stack.ps1
```

`run-stack.ps1` فقط `start-all.ps1` را صدا می‌زند:

1. آزاد کردن پورت‌ها  
2. sync JWT  
3. Docker Redis + 5 Postgres  
4. auth → users → appointment → insurance → blog (هر کدام تا `/health`)  
5. gateway (Redis-only)  
6. سه فرانت Next  
7. `verify-stack.ps1`  

توقف اپ‌ها (Docker می‌ماند):

```powershell
.\scripts\stop-apps.ps1
```

لاگ‌ها: پوشه `.run-logs/`

> اولین compile فرانت ممکن است ۳۰–۹۰ ثانیه طول بکشد.

---

## 7. آدرس‌ها بعد از بالا آمدن

| سطح | URL |
|-----|-----|
| سایت | http://localhost:4000/fa |
| CMS | http://localhost:3000/fa/admin |
| کنسول سیستم | http://localhost:2000/fa/console |
| Gateway health | http://127.0.0.1:8080/health |
| Blog/CMS API | http://127.0.0.1:5005/health |
| Auth | http://127.0.0.1:5001/health |

### ورود توسعه

- کنسول سیستم: پس از `seed_admin.py` — موبایل و رمزی که seed کردید  
- CMS: ثبت‌نام با پنل CMS سپس تأیید از کنسول سیستم  
- بیمار: ثبت‌نام از سایت عمومی → تأیید ادمین

---

## 8. ویدیو هیرو و بیمه‌ها

- ویدیو را در CMS (`:3000` → تب سایت) **آپلود** کنید (مسیر فایل ویندوز نگذارید).  
- فایل در `blog-service/uploads/` و URL در Postgres blog ذخیره می‌شود.  
- سایت از پروکسی `/cms-media/uploads/...` روی `:4000` پخش می‌کند.  
- بیمه‌ها: seed لوگو در `frontend/public/insurance-logos/`؛ ویرایش در CMS یا کنسول → تب بیمه‌ها.

---

## 9. آنچه در گیت نیست (عمدی)

- `**/node_modules/`  
- `**/.venv/`  
- `.env` / `.env.local` / `.env.production`  
- `**/keys/*.pem` (به‌جز `.gitkeep`)  
- `**/uploads/`  
- `.next` / `.next-public` / `.next-cms` / `.next-admin`  
- `.run-logs/`  

فقط `.env.example`ها commit می‌شوند.

---

## 10. عیب‌یابی سریع

| مشکل | کار |
|------|-----|
| Docker unavailable | Docker Desktop را روشن کنید |
| `hospital-redis` name conflict | `docker start hospital-redis` |
| Gateway گیر می‌کند | `ENABLE_OPTIONAL_PROVIDERS=false`؛ `.\scripts\stop-apps.ps1` سپس دوباره استارت |
| سایت سفید / بدون ویدیو | blog `:5005` و آپلود CMS؛ hard refresh |
| Invalid credentials | `seed_admin.py`؛ نرمال‌سازی شماره `09...` |
| اسکریپت PowerShell parse error | فایل‌های `scripts/*.ps1` باید ASCII باشند (بدون — یونیکد) |

---

## 11. پروداکشن

جزئیات امنیتی و SMS: فایل `PRODUCTION.md`.  
خلاصه: رمز DB/Redis، SMS واقعی، CORS دامنه واقعی، HTTPS جلوی gateway، عوض کردن seed ادمین.
