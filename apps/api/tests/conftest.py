import asyncio
import re

import asyncpg
import pytest
from kerf.config import settings
from kerf.db.session import run_migrations


async def _ensure_database_exists() -> None:
    db_url = settings.TEST_DATABASE_URL.replace(
        "postgresql+asyncpg://", "postgresql://"
    )
    match = re.match(r"(postgresql://[^/]+)/([^?]+)", db_url)
    if not match:
        return
    base_url, db_name = match.groups()
    admin_url = f"{base_url}/postgres"
    conn = await asyncpg.connect(admin_url)
    try:
        exists = await conn.fetchval(
            f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'"
        )
        if not exists:
            await conn.execute(f'CREATE DATABASE "{db_name}"')
    finally:
        await conn.close()

    # Ensure extensions on test db
    test_conn = await asyncpg.connect(db_url)
    try:
        await test_conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        await test_conn.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    finally:
        await test_conn.close()


@pytest.fixture(autouse=True, scope="session")
def setup_test_database() -> None:
    """Ensure test database exists and run alembic upgrade head once for test suite."""
    asyncio.run(_ensure_database_exists())
    run_migrations()
