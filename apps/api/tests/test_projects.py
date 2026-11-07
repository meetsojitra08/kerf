import pytest
from httpx import ASGITransport, AsyncClient
from kerf.db.session import init_db
from kerf.main import app


@pytest.mark.asyncio
async def test_e2e_project_crud() -> None:
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login user to get JWT token
        login_res = await client.post("/v1/auth/login", json={"email": "creator@kerf.dev"})
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create Project (Acceptance Check: e2e create project)
        create_payload = {
            "name": "First Talking Head Cut",
            "fps_num": 30,
            "fps_den": 1,
            "width": 1920,
            "height": 1080,
        }
        create_res = await client.post("/v1/projects", json=create_payload, headers=headers)
        assert create_res.status_code == 201
        project = create_res.json()
        project_id = project["id"]
        assert project["name"] == "First Talking Head Cut"
        assert project["head_revision"] == 0
        assert project["fps_num"] == 30

        # 3. Retrieve Project by ID
        get_res = await client.get(f"/v1/projects/{project_id}", headers=headers)
        assert get_res.status_code == 200
        assert get_res.json()["id"] == project_id
        assert get_res.json()["name"] == "First Talking Head Cut"

        # 4. List Projects
        list_res = await client.get("/v1/projects", headers=headers)
        assert list_res.status_code == 200
        projects_list = list_res.json()
        assert any(p["id"] == project_id for p in projects_list)

        # 5. Update Project
        update_res = await client.patch(
            f"/v1/projects/{project_id}",
            json={"name": "Renamed Talking Head Cut", "height": 1920, "width": 1080},
            headers=headers,
        )
        assert update_res.status_code == 200
        assert update_res.json()["name"] == "Renamed Talking Head Cut"
        assert update_res.json()["height"] == 1920

        # 6. Delete Project
        del_res = await client.delete(f"/v1/projects/{project_id}", headers=headers)
        assert del_res.status_code == 204

        # 7. Verify 404 after deletion
        not_found_res = await client.get(f"/v1/projects/{project_id}", headers=headers)
        assert not_found_res.status_code == 404

        # 8. Unauthenticated request to projects rejected
        unauth_res = await client.post("/v1/projects", json=create_payload)
        assert unauth_res.status_code == 401
