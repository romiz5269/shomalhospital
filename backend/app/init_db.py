from sqlalchemy import text

from app.database import Base, engine


def ensure_enums() -> None:
    stmts = [
        """DO $$ BEGIN
            CREATE TYPE "Urgency" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;""",
        """DO $$ BEGIN
            CREATE TYPE "TicketCategory" AS ENUM (
              'IT','MEDICAL_EQUIPMENT','FACILITIES','HR','PHARMACY','OTHER'
            );
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;""",
        """DO $$ BEGIN
            CREATE TYPE "TicketStatus" AS ENUM ('OPEN','IN_PROGRESS','RESOLVED','CLOSED');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;""",
    ]
    with engine.begin() as conn:
        for stmt in stmts:
            conn.execute(text(stmt))


def main() -> None:
    from app import models  # noqa: F401

    ensure_enums()
    Base.metadata.create_all(bind=engine)
    print("database ready")


if __name__ == "__main__":
    main()
