FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# افزایش timeout و retry برای مقابله با قطعی/کندی شبکه
RUN pip install --no-cache-dir \
    --default-timeout=200 \
    --retries 15 \
    -r requirements.txt

COPY app ./app
COPY scripts ./scripts
RUN mkdir -p /app/uploads/asset_images
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]