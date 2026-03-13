import os

import asyncpg


async def db_health_check() -> bool:
    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL must be set")
    conn = await asyncpg.connect(dsn)
    try:
        await conn.execute("select 1")
        return True
    finally:
        await conn.close()
