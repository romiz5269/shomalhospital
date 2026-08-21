from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models import ActivityLog

MONGO_COLLECTION = "logs"

try:
    from pymongo import MongoClient
    _mongo: Optional[MongoClient] = None
    _mongo_db = None

    def _get_mongo():
        global _mongo, _mongo_db
        if _mongo is None:
            _mongo = MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=2000)
            _mongo_db = _mongo["pm_logs"]
        return _mongo_db
except ImportError:
    _get_mongo = None


def log_activity(
    db: Session,
    *,
    user_id: int | None,
    user_name: str,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    details: str | None = None,
) -> None:
    doc = {
        "user_id": user_id,
        "user_name": user_name,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details,
        "created_at": datetime.utcnow(),
    }

    # Write to MongoDB first
    try:
        if _get_mongo is not None:
            mdb = _get_mongo()
            if mdb is not None:
                mdb[MONGO_COLLECTION].insert_one(doc.copy())
    except Exception:
        pass

    # Also write to PostgreSQL for backward compat
    db.add(
        ActivityLog(
            user_id=user_id,
            user_name=user_name,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        )
    )
    db.commit()


def get_logs_from_mongo(
    user_id: int | None = None,
    limit: int = 100,
) -> list[dict]:
    """Read logs from MongoDB. Falls back to empty list if unavailable."""
    try:
        if _get_mongo is not None:
            mdb = _get_mongo()
            if mdb is not None:
                q: dict = {}
                if user_id is not None:
                    q["user_id"] = user_id
                cursor = mdb[MONGO_COLLECTION].find(q).sort("created_at", -1).limit(limit)
                results = []
                for doc in cursor:
                    doc["_id"] = str(doc["_id"])
                    results.append(doc)
                return results
    except Exception:
        pass
    return []
