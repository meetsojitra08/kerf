import logging
from typing import Any

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings
from arq.jobs import Job

from kerf.config import settings

logger = logging.getLogger("kerf.queue")


async def get_arq_redis() -> ArqRedis:
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    return await create_pool(redis_settings)


async def enqueue_job(function_name: str, *args: Any, **kwargs: Any) -> Job | None:
    pool = await get_arq_redis()
    try:
        job = await pool.enqueue_job(function_name, *args, **kwargs)
        logger.info(
            "Enqueued arq job %s (id: %s)",
            function_name,
            job.job_id if job else None,
        )
        return job
    finally:
        await pool.aclose()
