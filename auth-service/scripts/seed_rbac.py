import asyncio
from app.db import connect_db, disconnect_db
from app.services.rbac import rbac_service

async def main():
    await connect_db()
    await rbac_service.seed_defaults()
    await disconnect_db()
    print("rbac seeded")

asyncio.run(main())
