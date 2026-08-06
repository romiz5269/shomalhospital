"""Create a verified admin user for bootstrap (phone + optional password)."""

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.db import connect_db, db, disconnect_db
from app.services.password import hash_password
from app.services.rbac import rbac_service


async def main() -> None:
    phone = sys.argv[1] if len(sys.argv) > 1 else "09000000000"
    password = sys.argv[2] if len(sys.argv) > 2 else "Admin@12345"

    await connect_db()
    await rbac_service.seed_defaults()

    user = await db.user.find_unique(where={"phone": phone})
    if user:
        print(f"Admin already exists: {user.id}")
    else:
        user = await db.user.create(
            data={
                "phone": phone,
                "email": "admin@hospital.local",
                "firstName": "System",
                "lastName": "Admin",
                "passwordHash": hash_password(password),
                "isActive": True,
                "isVerified": True,
            }
        )
        await rbac_service.assign_role_to_user(user.id, "admin")
        print(f"Admin created: {user.id}")
        print(f"phone={phone} password={password}")

    await disconnect_db()


if __name__ == "__main__":
    asyncio.run(main())
