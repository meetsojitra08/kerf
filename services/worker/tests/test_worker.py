import pytest
from kerf_worker.main import noop_job


@pytest.mark.asyncio
async def test_noop_job_direct() -> None:
    res = await noop_job({})
    assert res == {"status": "ok", "job": "noop"}
