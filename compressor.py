import os

from pathlib import Path
from PIL import Image

from config import (
    MIN_QUALITY,
    QUALITY_STEP,
    RESIZE_STEP,
    MIN_WIDTH,
    MIN_HEIGHT,
)


def get_file_size_kb(path: str | Path) -> float:
    return os.path.getsize(path) / 1024


def validate_image(path: str | Path) -> bool:
    try:
        with Image.open(path) as image:
            image.verify()

        return True

    except Exception:
        return False


def prepare_image(path: str | Path) -> Image.Image:
    image = Image.open(path)

    # JPEG از Alpha پشتیبانی نمی‌کند
    if image.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", image.size, "white")

        if image.mode == "P":
            image = image.convert("RGBA")

        background.paste(
            image,
            mask=image.getchannel("A")
            if "A" in image.getbands()
            else None
        )

        return background

    return image.convert("RGB")


def save_with_quality(
    image: Image.Image,
    output_path: Path,
    quality: int
):
    image.save(
        output_path,
        format="JPEG",
        quality=quality,
        optimize=True
    )


def compress_image(
    input_path: str | Path,
    output_path: str | Path,
    target_size_kb: int
):
    target_bytes = target_size_kb * 1024

    image = prepare_image(input_path)

 
    quality = 95

    while quality >= MIN_QUALITY:

        save_with_quality(
            image,
            output_path,
            quality
        )

        current_size = os.path.getsize(output_path)

        if current_size <= target_bytes:
            return

        quality -= QUALITY_STEP

   

    width, height = image.size

    while True:

        width = int(width * RESIZE_STEP)
        height = int(height * RESIZE_STEP)

        if width < MIN_WIDTH or height < MIN_HEIGHT:
            break

        resized = image.resize(
            (width, height),
            Image.Resampling.LANCZOS
        )

        quality = 75

        while quality >= MIN_QUALITY:

            save_with_quality(
                resized,
                output_path,
                quality
            )

            current_size = os.path.getsize(output_path)

            if current_size <= target_bytes:
                return

            quality -= QUALITY_STEP

 
    save_with_quality(
        image,
        output_path,
        MIN_QUALITY
    )