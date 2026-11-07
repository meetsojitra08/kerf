import pytest
from arq.jobs import Job
from arq.worker import create_worker
from httpx import ASGITransport, AsyncClient
from kerf.main import app
from kerf.queue import get_arq_redis
from kerf_worker.main import WorkerSettings


@pytest.mark.asyncio
async def test_worker_smoke_enqueue_and_execute() -> None:
    # 1. Enqueue job via API endpoint
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/health/worker-smoke")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "enqueued"
        job_id = data["job_id"]
        assert job_id is not None

    # 2. Assert worker executes the enqueued job
    worker = create_worker(WorkerSettings, burst=True)
    completed_jobs = await worker.run_check()
    assert completed_jobs >= 1

    # 3. Assert job result
    pool = await get_arq_redis()
    try:
        job = Job(job_id, pool)
        result = await job.result(timeout=5.0)
        assert result == {"status": "ok", "job": "noop"}
    finally:
        await pool.aclose()
