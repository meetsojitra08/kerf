from collections.abc import AsyncGenerator
from pathlib import Path

from alembic import command
from alembic.config import Config
from kerf.config import settings
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import AsyncAdaptedQueuePool, NullPool


def get_engine() -> AsyncEngine:
    db_url = settings.ACTIVE_DATABASE_URL
    if settings.TESTING:
        return create_async_engine(
            db_url,
            echo=False,
            future=True,
            poolclass=NullPool,
        )
    return create_async_engine(
        db_url,
        echo=False,
        future=True,
        poolclass=AsyncAdaptedQueuePool,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=3600,
    )


engine = get_engine()

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


def run_migrations(target_url: str | None = None) -> None:
    """Run alembic upgrade head programmatically."""
    api_dir = Path(__file__).resolve().parent.parent.parent
    ini_path = api_dir / "alembic.ini"
    alembic_cfg = Config(str(ini_path))
    db_url = target_url or settings.ACTIVE_DATABASE_URL
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)
    command.upgrade(alembic_cfg, "head")


async def init_db() -> None:
    """Initialize database tables via Alembic migrations."""
    run_migrations()
