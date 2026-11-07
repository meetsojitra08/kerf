import logging
import os
from typing import Any, ClassVar

from arq.connections import RedisSettings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kerf_worker")


async def noop_job(ctx: dict[str, Any], *args: Any, **kwargs: Any) -> dict[str, Any]:
    logger.info("Executing noop_job (smoke test)")
    return {"status": "ok", "job": "noop"}


async def ingest_asset(
    ctx: dict[str, Any],
    asset_id: str,
    project_id: str,
    storage_key: str,
    traceparent: str | None = None,
    *args: Any,
    **kwargs: Any,
) -> dict[str, Any]:
    logger.info(
        "Executing ingest_asset for asset %s (project: %s, key: %s, traceparent: %s)",
        asset_id,
        project_id,
        storage_key,
        traceparent,
    )
    return {"status": "accepted", "asset_id": asset_id}


async def cleanup_incomplete_uploads(
    ctx: dict[str, Any], *args: Any, **kwargs: Any
) -> dict[str, Any]:
    logger.info("Executing cleanup_incomplete_uploads")
    return {"status": "ok", "cleaned": 0}


class WorkerSettings:
    functions: ClassVar[list[Any]] = [
        noop_job,
        ingest_asset,
        cleanup_incomplete_uploads,
    ]
    redis_settings = RedisSettings.from_dsn(
        os.getenv("REDIS_URL", "redis://localhost:6379/0")
    )
    burst = False

