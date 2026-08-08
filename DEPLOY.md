# راهنمای استقرار — سامانه تیکتینگ

## معماری پیشنهادی Production

```
tickets.example.com  → Frontend کارکنان (:3000)
admin.example.com    → پنل ادمین (:3001)
api.example.com      → FastAPI + Socket.IO (:4000)
```

Postgres و Redis ترجیحاً فقط روی localhost سرور در دسترس باشند.

---

## کلون برنچ tiketing

```bash
git clone -b tiketing https://github.com/romiz5269/shomalhospital.git
cd shomalhospital
```

---

## آماده‌سازی سرور (Ubuntu نمونه)

```bash
sudo apt update && sudo apt upgrade -y
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs python3 python3-venv python3-pip docker.io docker-compose-v2 nginx
sudo systemctl enable docker && sudo systemctl start docker
```

---

## نصب پروژه روی سرور

```bash
cd /var/www
git clone -b tiketing https://github.com/romiz5269/shomalhospital.git hospital-tickets
cd hospital-tickets

npm install
npm run install:all

python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp admin/.env.example admin/.env
```

در `backend/.env` و `docker-compose.yml` رمزهای قوی بگذارید و هماهنگ کنید:

```env
DATABASE_URL=postgresql://ticket_admin:STRONG_DB_PASS@localhost:5434/hospital_tickets
JWT_SECRET=STRONG_RANDOM_JWT_SECRET_AT_LEAST_32_CHARS
CORS_ORIGIN=https://tickets.example.com,https://admin.example.com
REDIS_URL=redis://localhost:6379/0
```

فرانت:

```bash
echo "NEXT_PUBLIC_API_URL=https://api.example.com" > frontend/.env
echo "NEXT_PUBLIC_API_URL=https://api.example.com" > admin/.env
```

دیتابیس:

```bash
# در docker-compose پورت را محدود کنید: "127.0.0.1:5434:5432"
docker compose up -d
backend/.venv/bin/python -m app.init_db
```

Build فرانت:

```bash
npm run build --prefix frontend
npm run build --prefix admin
```

اجرای API با چند worker:

```bash
cd backend
.venv/bin/python -m uvicorn app.main:socket_app --host 0.0.0.0 --port 4000 --workers 4
```

فرانت‌ها:

```bash
npm run start --prefix frontend
npm run start --prefix admin
```

یا با PM2 / systemd مدیریت کنید.

---

## چک‌لیست امنیت

- [ ] `JWT_SECRET` قوی و یکتا
- [ ] رمز Postgres قوی؛ پورت DB فقط `127.0.0.1`
- [ ] `.env` در git نیست
- [ ] HTTPS (Certbot + Nginx)
- [ ] Rate limit مناسب Production
- [ ] بک‌آپ منظم Postgres

### بک‌آپ

```bash
docker exec hospital_ticket_db pg_dump -U ticket_admin hospital_tickets > backup-$(date +%F).sql
```

### بازیابی

```bash
cat backup-YYYY-MM-DD.sql | docker exec -i hospital_ticket_db psql -U ticket_admin -d hospital_tickets
```

---

## هشدار مهم

`docker compose down -v` volume دیتابیس را پاک می‌کند. فقط وقتی عمداً می‌خواهید دیتا از صفر باشد استفاده کنید.
