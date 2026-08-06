FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY prisma ./prisma
COPY app ./app
COPY static ./static
COPY scripts ./scripts

RUN prisma generate

ENV APP_ENV=production
ENV DEBUG=false
ENV OTP_DEV_RETURN_CODE=false
ENV PORT=5001
ENV PYTHONUNBUFFERED=1

EXPOSE 5001

# keys + .env mounted at runtime
CMD ["gunicorn", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", "-w", "4", "-b", "0.0.0.0:5001", "--access-logfile", "-", "--error-logfile", "-"]
