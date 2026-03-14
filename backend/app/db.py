import os

import asyncpg


def _get_dsn() -> str:
    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL must be set")
    return dsn


async def create_pool() -> asyncpg.Pool:
    return await asyncpg.create_pool(dsn=_get_dsn(), min_size=1, max_size=5)


async def db_health_check(pool: asyncpg.Pool) -> bool:
    async with pool.acquire() as conn:
        await conn.execute("select 1")
        return True
