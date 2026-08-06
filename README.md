# بیمارستان شمال (Shomal Hospital)

سایت رسمی و پورتال **بیمارستان تخصصی شمال — آمل، مازندران**  
برند رنگ: `#003B8E` · طراحی شیشه‌ای · هیرو ویدیویی · CMS صفحه‌ساز · نوبت‌دهی آنلاین

---

## فهرست

1. [پیش‌نیازها](#1-پیش‌نیازها)
2. [معماری و پورت‌ها](#2-معماری-و-پورت‌ها)
3. [اجرای سریع (پیشنهادی)](#3-اجرای-سریع-پیشنهادی)
4. [اجرای دستی سرویس‌به‌سرویس](#4-اجرای-دستی-سرویس‌به‌سرویس)
5. [آدرس‌های مهم](#5-آدرس‌های-مهم)
6. [ورود ادمین و CMS](#6-ورود-ادمین-و-cms)
7. [آپلود ویدیو هیرو](#7-آپلود-ویدیو-هیرو)
8. [متغیرهای محیطی فرانت](#8-متغیرهای-محیطی-فرانت)
9. [دیتابیس‌ها (Docker)](#9-دیتابیس‌ها-docker)
10. [ساختار پوشه‌ها](#10-ساختار-پوشه‌ها)
11. [APIهای کلیدی](#11-apiهای-کلیدی)
12. [عیب‌یابی](#12-عیب‌یابی)
13. [تکنولوژی‌ها](#13-تکنولوژی‌ها)

---

## 1. پیش‌نیازها

| ابزار | نسخه پیشنهادی | کاربرد |
|--------|----------------|--------|
| **Windows 10/11** | — | محیط توسعه |
| **Docker Desktop** | آخرین نسخه | Postgres + Redis |
| **Python** | 3.11+ | میکروسرویس‌های FastAPI |
| **Node.js** | 20+ (LTS) | Gateway + Frontend |
| **PowerShell** | 5.1+ / 7+ | اسکریپت‌های `start.ps1` |
| **Git** | اختیاری | کلون پروژه |

> قبل از اجرا Docker Desktop را روشن کنید.

---

## 2. معماری و پورت‌ها

```
Browser (4000)
    │
    ▼
Next.js Frontend ──────────────┐
    │                          │
    ▼                          ▼
API Gateway :8080         Blog public :5005
    │
    ├── /api/v1/auth        → Auth        :5001
    ├── /api/v1/users       → Users       :5002
    ├── /api/v1/appointment → Appointment :5003
    ├── /api/v1/pages       → Blog/CMS    :5005
    └── (insurance public)  → Insurance   :5004  (مستقیم از فرانت هم)
```

| سرویس | پورت | نقش |
|--------|------|-----|
| **Frontend** (Next.js) | `4000` | سایت فارسی/انگلیسی |
| **Gateway** (Express) | `8080` | JWT، پروکسی، CORS |
| **auth-service** | `5001` | ثبت‌نام، OTP، لاگین، JWT |
| **users-service** | `5002` | پروفایل کاربران |
| **appointment-service** | `5003` | نوبت‌دهی |
| **insurance-service** | `5004` | بیمه‌ها |
| **blog-service (CMS)** | `5005` | صفحات، پزشکان، اخبار، آپلود |
| **Redis** | `6379` | بلک‌لیست JWT |
| **Postgres Auth** | `5434` | دیتابیس Auth |
| **Postgres Users** | `5435` | دیتابیس Users |
| **Postgres Appointments** | `5436` | دیتابیس نوبت |
| **Postgres Insurance** | `5437` | دیتابیس بیمه |
| **Postgres Blog/CMS** | `5438` | دیتابیس CMS |

---

## 3. اجرای سریع (پیشنهادی)

از ریشه پروژه:

```powershell
cd "C:\Users\yasin\Desktop\hospital site"
.\scripts\run-stack.ps1
```

این اسکریپت:

1. پورت‌های اشغال‌شده را آزاد می‌کند
2. کلید JWT را با گیت‌وی همگام می‌کند (`sync-jwt-key.ps1`)
3. هر سرویس را در **پنجره PowerShell جدا** با `scripts\start.ps1` خودش بالا می‌آورد

بعد از چند دقیقه این‌ها را باز کنید:

| صفحه | آدرس |
|------|------|
| سایت فارسی | http://localhost:4000/fa |
| سایت انگلیسی | http://localhost:4000/en |
| سلامت گیت‌وی | http://127.0.0.1:8080/health |

---

## 4. اجرای دستی سرویس‌به‌سرویس

اگر می‌خواهید کنترل بیشتری داشته باشید، **ترتیب زیر** را در ترمینال‌های جدا رعایت کنید.

### ۴.۱ — Auth (اول اجرا شود)

```powershell
cd "C:\Users\yasin\Desktop\hospital site\auth-service"
.\scripts\start.ps1
```

کارهایی که اسکریپت انجام می‌دهد:

- بالا آوردن Postgres (`5434`) + Redis (`6379`)
- ساخت venv و نصب وابستگی‌ها
- تولید کلید JWT (اگر نبود)
- `prisma db push` + seed ادمین

Docs: http://127.0.0.1:5001/docs

### ۴.۲ — Users / Appointment / Insurance / Blog

```powershell
cd "...\users-service";       .\scripts\start.ps1   # :5002
cd "...\appointment-service"; .\scripts\start.ps1   # :5003
cd "...\insurance-service";   .\scripts\start.ps1   # :5004
cd "...\blog-service";        .\scripts\start.ps1   # :5005  ← CMS
```

هر کدام Docker Postgres خودش را بالا می‌آورد.

### ۴.۳ — Gateway

```powershell
cd "C:\Users\yasin\Desktop\hospital site\gateway"
.\scripts\start.ps1
```

قبل از گیت‌وی حتماً Auth بالا باشد. برای همگام‌سازی کلید عمومی JWT:

```powershell
cd "C:\Users\yasin\Desktop\hospital site"
.\scripts\sync-jwt-key.ps1
```

### ۴.۴ — Frontend

```powershell
cd "C:\Users\yasin\Desktop\hospital site\frontend"
npm install          # فقط بار اول
.\scripts\start.ps1
# یا:
npm run dev
```

سایت: http://localhost:4000/fa

---

## 5. آدرس‌های مهم

| مورد | URL |
|------|-----|
| خانه (FA) | http://localhost:4000/fa |
| خانه (EN) | http://localhost:4000/en |
| ورود | http://localhost:4000/fa/login |
| ثبت‌نام | http://localhost:4000/fa/signup |
| نوبت‌دهی | http://localhost:4000/fa/appointments |
| پزشکان | http://localhost:4000/fa/doctors |
| اخبار | http://localhost:4000/fa/blog |
| **پنل CMS** | http://localhost:4000/fa/admin |
| Gateway Health | http://127.0.0.1:8080/health |
| Auth Docs | http://127.0.0.1:5001/docs |
| CMS Public Site | http://127.0.0.1:5005/public/site |
| CMS Public Doctors | http://127.0.0.1:5005/public/doctors |
| Blog Public Posts | http://127.0.0.1:5005/public/posts |

---

## 6. ورود ادمین و CMS

### حساب ادمین (seed خودکار)

| فیلد | مقدار |
|------|--------|
| موبایل | `09000000000` |
| رمز عبور | `Admin@12345` |

### مسیر کار با CMS

1. برو به http://localhost:4000/fa/login
2. با حساب بالا وارد شو
3. برو به http://localhost:4000/fa/admin
4. تب‌ها:
   - **تنظیمات سایت** — عنوان هیرو، ویدیو، پوستر
   - **سازنده صفحه** — drag & drop بلوک‌ها، قالب‌ها، پیش‌نمایش موبایل/تبلت/دسکتاپ
   - **پزشکان** — CRUD پزشکان
   - **بلاگ** — لیست مطالب

> برای دسترسی ادمین نقش `admin` یا مجوزهایی مثل `pages:write` / `auth:manage` لازم است.

### تست لاگین از PowerShell

```powershell
$body = '{"phone":"09000000000","password":"Admin@12345"}'
$login = Invoke-RestMethod -Method POST http://127.0.0.1:8080/api/v1/auth/login `
  -ContentType "application/json" -Body $body
$token = $login.tokens.access_token
Invoke-RestMethod http://127.0.0.1:8080/api/v1/pages/admin/site `
  -Headers @{ Authorization = "Bearer $token" }
```

---

## 7. آپلود ویدیو هیرو

1. وارد پنل ادمین شو (`/fa/admin`)
2. تب **تنظیمات سایت**
3. فایل `mp4` / `webm` / `mov` را انتخاب کن (حداکثر ~۸۰MB)
4. بعد از آپلود، ویدیو **خودکار ذخیره** می‌شود و روی صفحه اصلی اعمال می‌گردد
5. می‌توانی به‌جای آپلود، لینک مستقیم ویدیو را هم در فیلد «آدرس ویدیو» بگذاری و ذخیره کنی

فایل‌های آپلودی روی `blog-service/uploads` ذخیره می‌شوند و از مسیرهایی مثل:

```
http://127.0.0.1:5005/uploads/<filename>.mp4
```

سرو می‌شوند.

---

## 8. متغیرهای محیطی فرانت

فایل: `frontend/.env.local`

```env
NEXT_PUBLIC_GATEWAY_URL=http://127.0.0.1:8080/api/v1
NEXT_PUBLIC_AUTH_URL=http://127.0.0.1:8080/api/v1/auth
NEXT_PUBLIC_CMS_ADMIN_URL=http://127.0.0.1:8080/api/v1/pages
NEXT_PUBLIC_INSURANCE_URL=http://127.0.0.1:5004
NEXT_PUBLIC_BLOG_URL=http://127.0.0.1:5005
NEXT_PUBLIC_APPOINTMENT_URL=http://127.0.0.1:8080/api/v1/appointment
NEXT_PUBLIC_HERO_VIDEO_URL=https://assets.mixkit.co/videos/preview/mixkit-team-of-doctors-in-a-hospital-corridor-42774-large.mp4
```

بعد از تغییر `.env.local`، dev server را یک‌بار ری‌استارت کنید.

---

## 9. دیتابیس‌ها (Docker)

هر سرویس compose خودش را دارد؛ با `.\scripts\start.ps1` معمولاً خودکار بالا می‌آید.

| Container | پورت میزبان | DB |
|-----------|-------------|-----|
| `hospital-postgres-auth` | 5434 | `shomal_auth` |
| `hospital-postgres-users` | 5435 | `shomal_users` |
| `hospital-postgres-appointments` | 5436 | `shomal_appointments` |
| `hospital-postgres-insurance` | 5437 | `shomal_insurance` |
| `hospital-postgres-blog` | 5438 | `shomal_blog` |
| `hospital-redis` | 6379 | — |

وضعیت کانتینرها:

```powershell
docker ps
```

فقط زیرساخت Auth + Redis از ریشه:

```powershell
cd "C:\Users\yasin\Desktop\hospital site"
docker compose up -d
```

---

## 10. ساختار پوشه‌ها

```
hospital site/
├── auth-service/          # احراز هویت + JWT (RS256)
├── users-service/         # پروفایل
├── appointment-service/   # نوبت‌دهی
├── insurance-service/     # بیمه‌ها
├── blog-service/          # CMS + اخبار + پزشکان + آپلود
├── gateway/               # API Gateway :8080
├── frontend/              # Next.js 16 + next-intl + Tailwind v4
├── scripts/
│   ├── run-stack.ps1      # اجرای کل استک
│   ├── sync-jwt-key.ps1   # همگام‌سازی کلید JWT با گیت‌وی
│   └── ...
├── docker-compose.yml     # Postgres Auth + Redis
└── README.md
```

### فرانت‌اند (مهم‌ترین مسیرها)

```
frontend/src/
├── app/[locale]/          # صفحات fa/en
├── components/
│   ├── home/              # هیرو، نوبت، آمار، پزشکان، اخبار...
│   ├── admin/             # CMS + Page Builder
│   ├── auth/              # فرم ورود/ثبت‌نام
│   └── layout/            # Header / Footer / Brand
├── lib/                   # auth-client, cms-client, config
└── messages/              # fa.json / en.json
```

---

## 11. APIهای کلیدی

پایه گیت‌وی: `http://127.0.0.1:8080/api/v1`

| متد | مسیر | توضیح |
|-----|------|--------|
| POST | `/auth/login` | ورود با موبایل/رمز |
| POST | `/auth/signup` | ثبت‌نام |
| POST | `/auth/otp/request` | درخواست OTP |
| GET | `/auth/me` | کاربر جاری (Bearer) |
| GET | `/pages/admin/site` | تنظیمات CMS (ادمین) |
| PATCH | `/pages/admin/site` | به‌روزرسانی هیرو/آدرس |
| PUT | `/pages/admin/site/blocks` | ذخیره بلوک‌های صفحه |
| POST | `/pages/admin/media/upload` | آپلود ویدیو/تصویر |
| GET | `/appointment/...` | نوبت‌ها |

عمومی (بدون گیت‌وی، مستقیم CMS):

| متد | مسیر |
|-----|------|
| GET | `http://127.0.0.1:5005/public/site` |
| GET | `http://127.0.0.1:5005/public/doctors` |
| GET | `http://127.0.0.1:5005/public/posts` |

---

## 12. عیب‌یابی

### پورت اشغال است (`EADDRINUSE`)

یعنی همان سرویس قبلاً در حال اجراست — معمولاً مشکلی نیست. برای آزاد کردن:

```powershell
# مثال: پورت 4000
Get-NetTCPConnection -LocalPort 4000 -State Listen |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

یا دوباره `.\scripts\run-stack.ps1` را بزنید (پورت‌ها را می‌بندد).

### CMS / ادمین 401 می‌دهد

1. مطمئن شو Auth (`5001`) و Gateway (`8080`) و Blog (`5005`) بالا هستند
2. کلید JWT را همگام کن: `.\scripts\sync-jwt-key.ps1`
3. از مرورگر خارج شو، دوباره با `09000000000` / `Admin@12345` وارد شو
4. Hard refresh: `Ctrl+Shift+R`

### صفحه سفید / خطای ۵۰۰ فرانت

- Gateway و Blog را چک کن
- لاگ ترمینال `npm run dev` را ببین
- دامنه تصاویر خارجی باید در `next.config.ts` مجاز باشد (`ui-avatars.com`, `images.unsplash.com`, …)

### ویدیو آپلود نمی‌شود

- Blog روی `5005` باشد
- Gateway تایم‌اوت صفحات ~۱۲۰ ثانیه است؛ فایل خیلی بزرگ نگذار
- فرمت: `mp4`, `webm`, `mov`

### Docker بالا نمی‌آید

```powershell
docker info
docker compose ps
docker ps -a
```

Docker Desktop را Restart کنید.

### بررسی سلامت سریع

```powershell
Invoke-WebRequest http://127.0.0.1:8080/health
Invoke-WebRequest http://127.0.0.1:5005/health
Invoke-WebRequest http://localhost:4000/fa
```

---

## 13. تکنولوژی‌ها

| لایه | استک |
|------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, next-intl, Framer Motion, dnd-kit |
| فونت | Estedad Variable + Vazirmatn (فارسی وب) |
| Gateway | Node.js, Express, http-proxy-middleware, Redis blacklist |
| Backend | FastAPI, Prisma, PostgreSQL, JWT RS256 |
| CMS | blog-service — Site Settings, Page Blocks, Doctors, Media Upload, Blog Posts |
| Infra | Docker Compose (Postgres ×5 + Redis) |

---

## برند و محتوا

| مورد | مقدار |
|------|--------|
| نام | بیمارستان شمال / Shomal Hospital |
| شهر | **آمل**، مازندران |
| تلفن | `011-4422` |
| رنگ سازمانی | `#003B8E` |

---

## خلاصه یک‌خطی اجرا

```powershell
cd "C:\Users\yasin\Desktop\hospital site"
.\scripts\run-stack.ps1
# سپس: http://localhost:4000/fa
# ادمین: 09000000000 / Admin@12345 → /fa/admin
```

---

ساخته‌شده برای پروژه بیمارستان شمال · توسعه محلی روی Windows
