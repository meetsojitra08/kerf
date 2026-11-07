import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from kerf.db.session import init_db
from kerf.main import app


@pytest.mark.asyncio
async def test_auth_flow() -> None:
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login or register with email
        res = await client.post("/v1/auth/login", json={"email": "editor@kerf.dev"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "editor@kerf.dev"

        token = data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get current user
        me_res = await client.get("/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["email"] == "editor@kerf.dev"
        assert me_data["id"] == data["user"]["id"]

        # 3. Unauthenticated request rejected
        unauth_res = await client.get("/v1/auth/me")
        assert unauth_res.status_code == 401

        # 4. Explicit registration flow
        reg_email = f"new_director_{uuid.uuid4().hex[:8]}@kerf.dev"
        reg_res = await client.post("/v1/auth/register", json={"email": reg_email})
        assert reg_res.status_code == 201
        reg_data = reg_res.json()
        assert reg_data["user"]["email"] == reg_email
        assert "access_token" in reg_data

        # 5. Duplicate registration rejected with 409 Conflict
        dup_res = await client.post("/v1/auth/register", json={"email": reg_email})
        assert dup_res.status_code == 409
