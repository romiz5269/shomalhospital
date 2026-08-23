from pydantic import BaseModel, Field


class CompressRequest(BaseModel):
    image_path: str = Field(
        ...,
        description="Path to the image on the server"
    )

    target_size_kb: int = Field(
        ...,
        gt=0,
        description="Maximum target size in KB"
    )


class CompressResponse(BaseModel):
    message: str
    original_size_kb: float
    target_size_kb: int
    final_size_kb: float | None = None
    output_path: str
    download_url: str | None = None