import logging
import os
from typing import Any, ClassVar

from arq.connections import RedisSettings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kerf_worker")


async def noop_job(ctx: dict[str, Any], *args: Any, **kwargs: Any) -> dict[str, Any]:
    logger.info("Executing noop_job (smoke test)")
    return {"status": "ok", "job": "noop"}


class WorkerSettings:
    functions: ClassVar[list[Any]] = [noop_job]
    redis_settings = RedisSettings.from_dsn(
        os.getenv("REDIS_URL", "redis://localhost:6379/0")
    )
    burst = False

