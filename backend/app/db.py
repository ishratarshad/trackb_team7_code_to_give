import logging
import os
from typing import Optional

import asyncpg

logger = logging.getLogger(__name__)


def _get_dsn() -> Optional[str]:
    dsn = os.getenv("DATABASE_URL")
    if not dsn or not str(dsn).strip():
        return None
    return str(dsn).strip()


async def create_pool() -> Optional[asyncpg.Pool]:
    dsn = _get_dsn()
    if dsn is None:
        logger.warning("DATABASE_URL not set; database features disabled")
        return None
    return await asyncpg.create_pool(dsn=dsn, min_size=1, max_size=5)


async def db_health_check(pool: Optional[asyncpg.Pool]) -> bool:
    if pool is None:
        return False
    async with pool.acquire() as conn:
        await conn.execute("select 1")
        return True
