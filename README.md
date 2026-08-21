cd C:\Users\yasin\Desktop\pm
.\start-backend.bat

```powershell
cd C:\Users\yasin\Desktop\pm
docker compose up -d
```





cd C:\Users\yasin\Desktop\pm\frontend
npm run dev -- -H 0.0.0.0

PostgreSQL روی پورت **5433**.

### تنظیمات MongoDB (Logs)

- Host: `localhost`
- Port: `27017`
- Database: `pm_logs`
- Username: ندارد
- Password: ندارد
- Auth: خاموش است (فعلاً بدون یوزرنیم/پسورد)

Connection string:

```env
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=pm_logs
```

### ۲. Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

فایل `backend/.env`:

```env
DATABASE_URL=postgresql://pm_user:pm_pass@localhost:5433/north_hospital_pm
SECRET_KEY=یک-کلید-تصادفی-طولانی
HOST=0.0.0.0
PORT=8001
CORS_ORIGINS=http://localhost:3000,http://10.1.1.50:3000
NETWORK_MODE=network
NETWORK_SCAN_SUBNET=10.1.1.0/24

AD_ENABLED=true
AD_SERVER=10.1.1.10
AD_DOMAIN=shomal.local
AD_BASE_DN=DC=shomal,DC=local
AD_BIND_USER=pm-service@shomal.local
AD_BIND_PASSWORD=رمز-سرویس
AD_SEARCH_OUS=OU=Computers,OU=IT,DC=shomal,DC=local;OU=Clients,DC=shomal,DC=local
```

> OUهای خودتان را در `AD_SEARCH_OUS` با `;` جدا کنید.

```powershell
.\start-backend.bat
```

### ۳. Frontend

```powershell
cd frontend
npm install
```

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8001/api
```

```powershell
.\start-frontend.bat
```

### ۴. ورود

- http://localhost:3000
- `admin` / `admin123`

---

## کشف شبکه + AD (مثل TeamViewer)

1. **شبکه و AD** → OU را انتخاب کنید
2. **کشف شبکه + AD**
3. subnet (10.1.1.x) + کامپیوترهای OU ادغام می‌شوند
4. **ثبت تجهیزات جدید در PM**

---

## هشدار خودکار

- ویندوز ۱۸۰ روز — از تاریخ ثبت/فعال‌سازی
- PM — از آخرین سرویس یا ۹۰ روز بعد از ثبت
- کالای نصب‌نشده — ۱۴+ روز از دریافت
