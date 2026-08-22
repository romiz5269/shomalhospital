
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import download, status, upload

app = FastAPI(
    title="Video Compressor API",
    description="سرویس مستقل فشرده‌سازی ویدیو، آماده برای اتصال به هر وبسایت/سیستم دیگر",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api/v1")
app.include_router(status.router, prefix="/api/v1")
app.include_router(download.router, prefix="/api/v1")


@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "video-compressor-api"}