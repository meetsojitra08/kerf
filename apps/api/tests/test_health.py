import pytest
from httpx import ASGITransport, AsyncClient
from kerf.main import app


@pytest.mark.asyncio
async def test_health_endpoints() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res1 = await client.get("/health")
        assert res1.status_code == 200
        assert res1.json() == {"status": "ok", "app": "kerf-api"}

        res2 = await client.get("/healthz")
        assert res2.status_code == 200
        assert res2.json() == {"status": "ok", "app": "kerf-api"}
