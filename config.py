from pathlib import Path


OUTPUT_DIR = Path("compressed")
OUTPUT_DIR.mkdir(exist_ok=True)

MIN_QUALITY = 20
QUALITY_STEP = 5
RESIZE_STEP = 0.90
MIN_WIDTH = 100
MIN_HEIGHT = 100