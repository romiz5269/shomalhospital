from datetime import datetime
import re

from pydantic import BaseModel, Field, field_validator


_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class BlogPostOut(BaseModel):
    id: str
    slug: str
    title_fa: str
    title_en: str | None = None
    excerpt_fa: str | None = None
    excerpt_en: str | None = None
    content_fa: str | None = None
    content_en: str | None = None
    cover_image_url: str | None = None
    video_url: str | None = None
    category: str | None = None
    tags: list[str] = Field(default_factory=list)
    is_published: bool
    published_at: datetime | None = None
    view_count: int
    is_featured: bool
    is_active: bool
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    author_id: str | None = None
    author_name: str | None = None


class BlogPostSummary(BaseModel):
    id: str
    slug: str
    title_fa: str
    title_en: str | None = None
    excerpt_fa: str | None = None
    excerpt_en: str | None = None
    cover_image_url: str | None = None
    category: str | None = None
    tags: list[str] = Field(default_factory=list)
    is_featured: bool
    published_at: datetime | None = None
    view_count: int
    author_name: str | None = None


class BlogPostCreate(BaseModel):
    slug: str = Field(min_length=2, max_length=120)
    title_fa: str = Field(min_length=2, max_length=300)
    title_en: str | None = Field(default=None, max_length=300)
    excerpt_fa: str | None = Field(default=None, max_length=500)
    excerpt_en: str | None = Field(default=None, max_length=500)
    content_fa: str | None = Field(default=None, max_length=50000)
    content_en: str | None = Field(default=None, max_length=50000)
    cover_image_url: str | None = Field(default=None, max_length=500)
    video_url: str | None = Field(default=None, max_length=500)
    category: str | None = Field(default=None, max_length=80)
    tags: list[str] = Field(default_factory=list)
    is_published: bool = False
    is_featured: bool = False
    is_active: bool = True
    author_id: str | None = Field(default=None, max_length=64)
    author_name: str | None = Field(default=None, max_length=120)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str) -> str:
        slug = value.strip().lower()
        if not _SLUG_RE.match(slug):
            raise ValueError("slug must be lowercase alphanumeric with hyphens")
        return slug

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for tag in value:
            t = tag.strip()
            if t and t not in seen:
                seen.add(t)
                out.append(t)
        return out


class BlogPostUpdate(BaseModel):
    slug: str | None = Field(default=None, min_length=2, max_length=120)
    title_fa: str | None = Field(default=None, min_length=2, max_length=300)
    title_en: str | None = Field(default=None, max_length=300)
    excerpt_fa: str | None = Field(default=None, max_length=500)
    excerpt_en: str | None = Field(default=None, max_length=500)
    content_fa: str | None = Field(default=None, max_length=50000)
    content_en: str | None = Field(default=None, max_length=50000)
    cover_image_url: str | None = Field(default=None, max_length=500)
    video_url: str | None = Field(default=None, max_length=500)
    category: str | None = Field(default=None, max_length=80)
    tags: list[str] | None = None
    is_published: bool | None = None
    is_featured: bool | None = None
    is_active: bool | None = None
    author_id: str | None = Field(default=None, max_length=64)
    author_name: str | None = Field(default=None, max_length=120)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str | None) -> str | None:
        if value is None:
            return None
        slug = value.strip().lower()
        if not _SLUG_RE.match(slug):
            raise ValueError("slug must be lowercase alphanumeric with hyphens")
        return slug

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        seen: set[str] = set()
        out: list[str] = []
        for tag in value:
            t = tag.strip()
            if t and t not in seen:
                seen.add(t)
                out.append(t)
        return out


class BlogPostListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[BlogPostOut]


class PublicBlogPostListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[BlogPostSummary]


class MessageResponse(BaseModel):
    success: bool = True
    message: str
