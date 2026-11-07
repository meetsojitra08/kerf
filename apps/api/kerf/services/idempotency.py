import json
import logging
from typing import Any, cast

import redis.asyncio as aioredis
from kerf.config import settings

logger = logging.getLogger("kerf.idempotency")


async def get_redis() -> aioredis.Redis:
    client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)  # type: ignore[no-untyped-call]
    return cast(aioredis.Redis, client)


async def check_idempotency(key: str | None) -> dict[str, Any] | None:
    if not key:
        return None
    r = await get_redis()
    try:
        val = await r.get(f"idempotency:{key}")
        if val:
            return cast(dict[str, Any], json.loads(val))
        return None
    finally:
        await r.aclose()


async def record_idempotency(
    key: str | None, response_data: dict[str, Any], ttl_seconds: int = 86400
) -> None:
    if not key:
        return
    r = await get_redis()
    try:
        await r.setex(f"idempotency:{key}", ttl_seconds, json.dumps(response_data))
    finally:
        await r.aclose()
