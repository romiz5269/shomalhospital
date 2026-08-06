FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY prisma ./prisma
COPY app ./app
COPY scripts ./scripts

RUN prisma generate

ENV APP_ENV=production
ENV DEBUG=false
ENV PORT=5003
ENV PYTHONUNBUFFERED=1

EXPOSE 5003

CMD ["gunicorn", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", "-w", "2", "-b", "0.0.0.0:5003", "--access-logfile", "-", "--error-logfile", "-"]
