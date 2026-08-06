from datetime import datetime, timezone

from fastapi import HTTPException

from app.db import db
from app.schemas.posts import (
    BlogPostCreate,
    BlogPostListResponse,
    BlogPostOut,
    BlogPostSummary,
    BlogPostUpdate,
    PublicBlogPostListResponse,
)


def _to_out(row) -> BlogPostOut:
    return BlogPostOut(
        id=row.id,
        slug=row.slug,
        title_fa=row.titleFa,
        title_en=row.titleEn,
        excerpt_fa=row.excerptFa,
        excerpt_en=row.excerptEn,
        content_fa=row.contentFa,
        content_en=row.contentEn,
        cover_image_url=row.coverImageUrl,
        video_url=row.videoUrl,
        category=row.category,
        tags=list(row.tags or []),
        is_published=row.isPublished,
        published_at=row.publishedAt,
        view_count=row.viewCount,
        is_featured=row.isFeatured,
        is_active=row.isActive,
        deleted_at=row.deletedAt,
        created_at=row.createdAt,
        updated_at=row.updatedAt,
        author_id=row.authorId,
        author_name=row.authorName,
    )


def _to_summary(row) -> BlogPostSummary:
    return BlogPostSummary(
        id=row.id,
        slug=row.slug,
        title_fa=row.titleFa,
        title_en=row.titleEn,
        excerpt_fa=row.excerptFa,
        excerpt_en=row.excerptEn,
        cover_image_url=row.coverImageUrl,
        category=row.category,
        tags=list(row.tags or []),
        is_featured=row.isFeatured,
        published_at=row.publishedAt,
        view_count=row.viewCount,
        author_name=row.authorName,
    )


_CREATE_MAP = {
    "slug": "slug",
    "title_fa": "titleFa",
    "title_en": "titleEn",
    "excerpt_fa": "excerptFa",
    "excerpt_en": "excerptEn",
    "content_fa": "contentFa",
    "content_en": "contentEn",
    "cover_image_url": "coverImageUrl",
    "video_url": "videoUrl",
    "category": "category",
    "tags": "tags",
    "is_published": "isPublished",
    "is_featured": "isFeatured",
    "is_active": "isActive",
    "author_id": "authorId",
    "author_name": "authorName",
}


class BlogPostService:
    def _public_where(self, *, featured: bool | None = None) -> dict:
        where: dict = {
            "isPublished": True,
            "isActive": True,
            "deletedAt": None,
        }
        if featured is True:
            where["isFeatured"] = True
        return where

    async def list_public(
        self,
        *,
        page: int = 1,
        page_size: int = 10,
        featured: bool | None = None,
    ) -> PublicBlogPostListResponse:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 50)
        where = self._public_where(featured=featured)
        total = await db.blogpost.count(where=where)
        rows = await db.blogpost.find_many(
            where=where,
            order=[{"publishedAt": "desc"}, {"createdAt": "desc"}],
            skip=(page - 1) * page_size,
            take=page_size,
        )
        return PublicBlogPostListResponse(
            total=total,
            page=page,
            page_size=page_size,
            items=[_to_summary(r) for r in rows],
        )

    async def get_public_by_slug(self, slug: str) -> BlogPostOut:
        row = await db.blogpost.find_unique(where={"slug": slug})
        if (
            not row
            or row.deletedAt
            or not row.isActive
            or not row.isPublished
        ):
            raise HTTPException(status_code=404, detail="Post not found")

        updated = await db.blogpost.update(
            where={"id": row.id},
            data={"viewCount": {"increment": 1}},
        )
        return _to_out(updated)

    async def list_admin(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        q: str | None = None,
        category: str | None = None,
        is_published: bool | None = None,
        is_featured: bool | None = None,
        include_deleted: bool = False,
    ) -> BlogPostListResponse:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        where: dict = {}
        if not include_deleted:
            where["deletedAt"] = None
        if category:
            where["category"] = category
        if is_published is not None:
            where["isPublished"] = is_published
        if is_featured is not None:
            where["isFeatured"] = is_featured
        if q:
            where["OR"] = [
                {"titleFa": {"contains": q, "mode": "insensitive"}},
                {"titleEn": {"contains": q, "mode": "insensitive"}},
                {"slug": {"contains": q, "mode": "insensitive"}},
                {"category": {"contains": q, "mode": "insensitive"}},
            ]

        total = await db.blogpost.count(where=where)
        rows = await db.blogpost.find_many(
            where=where,
            order={"updatedAt": "desc"},
            skip=(page - 1) * page_size,
            take=page_size,
        )
        return BlogPostListResponse(
            total=total,
            page=page,
            page_size=page_size,
            items=[_to_out(r) for r in rows],
        )

    async def get_by_id(
        self, post_id: str, *, include_deleted: bool = False
    ) -> BlogPostOut:
        row = await db.blogpost.find_unique(where={"id": post_id})
        if not row or (row.deletedAt and not include_deleted):
            raise HTTPException(status_code=404, detail="Post not found")
        return _to_out(row)

    def _create_data(self, payload: BlogPostCreate, *, author_id: str | None) -> dict:
        data: dict = {}
        raw = payload.model_dump()
        for k, v in raw.items():
            col = _CREATE_MAP.get(k)
            if col is not None:
                data[col] = v
        if payload.is_published and "publishedAt" not in data:
            data["publishedAt"] = datetime.now(timezone.utc)
        if author_id and not data.get("authorId"):
            data["authorId"] = author_id
        return data

    async def create(
        self, payload: BlogPostCreate, *, actor_id: str | None = None
    ) -> BlogPostOut:
        existing = await db.blogpost.find_unique(where={"slug": payload.slug})
        if existing and not existing.deletedAt:
            raise HTTPException(status_code=409, detail="Slug already exists")

        if existing and existing.deletedAt:
            return await self._restore_and_update(existing.id, payload, actor_id)

        data = self._create_data(payload, author_id=actor_id)
        row = await db.blogpost.create(data=data)
        return _to_out(row)

    async def _restore_and_update(
        self, post_id: str, payload: BlogPostCreate, actor_id: str | None
    ) -> BlogPostOut:
        data = self._create_data(payload, author_id=actor_id)
        data["deletedAt"] = None
        data["isActive"] = payload.is_active
        row = await db.blogpost.update(where={"id": post_id}, data=data)
        return _to_out(row)

    async def upsert(
        self, payload: BlogPostCreate, *, actor_id: str | None = None
    ) -> tuple[BlogPostOut, bool]:
        existing = await db.blogpost.find_unique(where={"slug": payload.slug})
        if not existing:
            created = await self.create(payload, actor_id=actor_id)
            return created, True

        if existing.deletedAt:
            restored = await self._restore_and_update(existing.id, payload, actor_id)
            return restored, False

        update = BlogPostUpdate(**payload.model_dump())
        updated = await self.update(existing.id, update, actor_id=actor_id)
        return updated, False

    async def update(
        self,
        post_id: str,
        payload: BlogPostUpdate,
        *,
        actor_id: str | None = None,
    ) -> BlogPostOut:
        row = await db.blogpost.find_unique(where={"id": post_id})
        if not row or row.deletedAt:
            raise HTTPException(status_code=404, detail="Post not found")

        data: dict = {}
        raw = payload.model_dump(exclude_unset=True)
        for k, v in raw.items():
            col = _CREATE_MAP.get(k)
            if col is not None:
                data[col] = v

        if "slug" in data and data["slug"] != row.slug:
            clash = await db.blogpost.find_unique(where={"slug": data["slug"]})
            if clash and clash.id != post_id:
                raise HTTPException(status_code=409, detail="Slug already exists")

        if payload.is_published is True and not row.publishedAt:
            data["publishedAt"] = datetime.now(timezone.utc)
        if payload.is_published is False:
            data["publishedAt"] = None

        if actor_id and "authorId" not in data:
            pass  # keep existing author

        updated = await db.blogpost.update(where={"id": post_id}, data=data)
        return _to_out(updated)

    async def soft_delete(self, post_id: str) -> None:
        row = await db.blogpost.find_unique(where={"id": post_id})
        if not row or row.deletedAt:
            raise HTTPException(status_code=404, detail="Post not found")
        await db.blogpost.update(
            where={"id": post_id},
            data={
                "deletedAt": datetime.now(timezone.utc),
                "isActive": False,
            },
        )

    async def hard_delete(self, post_id: str) -> None:
        row = await db.blogpost.find_unique(where={"id": post_id})
        if not row:
            raise HTTPException(status_code=404, detail="Post not found")
        await db.blogpost.delete(where={"id": post_id})


blog_post_service = BlogPostService()
