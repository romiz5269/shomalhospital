from pathlib import Path
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

from config import OUTPUT_DIR
from schema import CompressRequest, CompressResponse
from compressor import (
    get_file_size_kb,
    validate_image,
    compress_image,
)


app = FastAPI(
    title="Image Compressor API",
    description="Modular image compression service",
    version="1.0.0",
)


@app.get("/")
def root():
    return {
        "service": "Image Compressor API",
        "status": "running",
    }


@app.post(
    "/compress",
    response_model=CompressResponse
)
def compress(request: CompressRequest):

    input_path = Path(request.image_path)

   

    if not input_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Image file not found"
        )

    if not input_path.is_file():
        raise HTTPException(
            status_code=400,
            detail="Path is not a file"
        )

    

    if not validate_image(input_path):
        raise HTTPException(
            status_code=400,
            detail="Invalid image file"
        )

    

    original_size_kb = get_file_size_kb(
        input_path
    )

    

    if original_size_kb <= request.target_size_kb:

        return CompressResponse(
            message="Image is already smaller than target size",
            original_size_kb=round(
                original_size_kb,
                2
            ),
            target_size_kb=request.target_size_kb,
            final_size_kb=round(
                original_size_kb,
                2
            ),
            output_path=str(input_path),
            download_url=None,
        )

    

    filename = (
        f"{input_path.stem}_"
        f"{uuid.uuid4().hex[:8]}.jpg"
    )

    output_path = OUTPUT_DIR / filename

    # -------------------------
    # فشرده‌سازی
    # -------------------------

    try:

        compress_image(
            input_path=input_path,
            output_path=output_path,
            target_size_kb=request.target_size_kb,
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Compression failed: {str(e)}"
        )

    # -------------------------
    # حجم نهایی
    # -------------------------

    final_size_kb = get_file_size_kb(
        output_path
    )

    return CompressResponse(
        message="Image compressed successfully",
        original_size_kb=round(
            original_size_kb,
            2
        ),
        target_size_kb=request.target_size_kb,
        final_size_kb=round(
            final_size_kb,
            2
        ),
        output_path=str(output_path),
        download_url=f"/download/{filename}",
    )


@app.get("/download/{filename}")
def download(filename: str):

    file_path = OUTPUT_DIR / filename

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Compressed image not found"
        )

    return FileResponse(
        path=file_path,
        media_type="image/jpeg",
        filename=filename,
    )


if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )