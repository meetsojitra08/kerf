import pytest
from kerf.db.session import run_migrations


@pytest.fixture(autouse=True, scope="session")
def setup_test_database():
    """Run alembic upgrade head once for test suite."""
    run_migrations()
