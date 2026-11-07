from kerf.config import settings
from kerf.db.session import get_engine, run_migrations
from sqlalchemy.pool import AsyncAdaptedQueuePool, NullPool


def test_engine_pool_selection() -> None:
    # 1. Under test configuration
    settings.TESTING = True
    test_eng = get_engine()
    assert isinstance(test_eng.pool, NullPool)

    # 2. Under production configuration
    settings.TESTING = False
    prod_eng = get_engine()
    assert isinstance(prod_eng.pool, AsyncAdaptedQueuePool)

    # Restore test configuration
    settings.TESTING = True


def test_run_migrations_idempotent() -> None:
    # Should run alembic upgrade head cleanly without error
    run_migrations()
