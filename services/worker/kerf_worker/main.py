import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kerf_worker")


async def main() -> None:
    logger.info("Kerf arq worker stub initialized.")
    while True:
        await asyncio.sleep(3600)


if __name__ == "__main__":
    asyncio.run(main())
