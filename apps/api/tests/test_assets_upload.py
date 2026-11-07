import uuid

import httpx
import pytest
from httpx import ASGITransport
from kerf.config import settings
from kerf.main import app
from kerf.routes.assets import DEFAULT_PART_SIZE, calculate_part_size


@pytest.fixture
async def auth_client():
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Register user A
        email = f"user_{uuid.uuid4().hex[:8]}@example.com"
        reg = await client.post(
            "/v1/auth/register",
            json={"email": email, "password": "securepassword123"},
        )
        assert reg.status_code == 201
        token = reg.json()["access_token"]
        user_id = reg.json()["user"]["id"]
        client.headers["Authorization"] = f"Bearer {token}"
        yield client, user_id


@pytest.fixture
async def other_auth_client():
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Register user B
        email = f"user_b_{uuid.uuid4().hex[:8]}@example.com"
        reg = await client.post(
            "/v1/auth/register",
            json={"email": email, "password": "securepassword123"},
        )
        assert reg.status_code == 201
        token = reg.json()["access_token"]
        user_id = reg.json()["user"]["id"]
        client.headers["Authorization"] = f"Bearer {token}"
        yield client, user_id


def test_part_size_scaling():
    # Small file: < 5 MiB
    assert calculate_part_size(1024 * 1024) == 1024 * 1024

    # 10 MiB file: default to 16 MiB
    assert calculate_part_size(10 * 1024 * 1024) == DEFAULT_PART_SIZE

    # 50 GB file: fits in 16 MiB parts (< 3,200 parts <= 10,000)
    assert calculate_part_size(50 * 1024 * 1024 * 1024) == DEFAULT_PART_SIZE

    # 200 GB file: 200 * 1024 / 9000 MiB ~ 22.75 MiB > 16 MiB
    large_size = 200 * 1024 * 1024 * 1024
    scaled = calculate_part_size(large_size)
    assert scaled > DEFAULT_PART_SIZE
    total_parts = (large_size + scaled - 1) // scaled
    assert total_parts <= 10000


@pytest.mark.asyncio
async def test_upload_lifecycle_and_ownership(auth_client, other_auth_client):
    client_a, _user_a_id = auth_client
    client_b, _user_b_id = other_auth_client

    # User A creates a project
    proj_resp = await client_a.post(
        "/v1/projects",
        json={"name": "Test Upload Project"},
    )
    assert proj_resp.status_code == 201
    project_id = proj_resp.json()["id"]

    # User B cannot start upload on User A's project
    forbidden_resp = await client_b.post(
        f"/v1/projects/{project_id}/assets/uploads",
        json={
            "filename": "camera_a.mov",
            "size": 32 * 1024 * 1024,
            "fingerprint": "fakefingerprint123",
        },
    )
    assert forbidden_resp.status_code == 403

    # User A starts upload with Idempotency-Key
    idem_key = str(uuid.uuid4())
    upload_resp = await client_a.post(
        f"/v1/projects/{project_id}/assets/uploads",
        headers={"Idempotency-Key": idem_key},
        json={
            "filename": "camera_a.mov",
            "size": 32 * 1024 * 1024,  # 32 MiB -> 2 parts of 16 MiB
            "fingerprint": "fakefingerprint123",
        },
    )
    assert upload_resp.status_code == 201
    upload_data = upload_resp.json()
    upload_id = upload_data["upload_id"]
    assert upload_data["total_parts"] == 2
    assert len(upload_data["parts"]) == 2

    # Presigned URLs must use S3_PUBLIC_ENDPOINT
    for p in upload_data["parts"]:
        assert settings.S3_PUBLIC_ENDPOINT in p["url"]

    # Test idempotency replay
    replay_resp = await client_a.post(
        f"/v1/projects/{project_id}/assets/uploads",
        headers={"Idempotency-Key": idem_key},
        json={
            "filename": "camera_a.mov",
            "size": 32 * 1024 * 1024,
            "fingerprint": "fakefingerprint123",
        },
    )
    assert replay_resp.status_code == 201
    assert replay_resp.json()["upload_id"] == upload_id

    # User B cannot view status of User A's upload
    status_b = await client_b.get(f"/v1/assets/uploads/{upload_id}")
    assert status_b.status_code == 403

    # User A checks upload status
    status_a = await client_a.get(f"/v1/assets/uploads/{upload_id}")
    assert status_a.status_code == 200
    assert status_a.json()["upload_id"] == upload_id
    assert status_a.json()["status"] == "uploading"

    # User A presigns additional parts
    parts_resp = await client_a.post(
        f"/v1/assets/uploads/{upload_id}/parts",
        json={"part_numbers": [1, 2]},
    )
    assert parts_resp.status_code == 200
    assert len(parts_resp.json()["parts"]) == 2
    for p in parts_resp.json()["parts"]:
        assert settings.S3_PUBLIC_ENDPOINT in p["url"]

    # User B cannot presign parts on User A's upload
    parts_b = await client_b.post(
        f"/v1/assets/uploads/{upload_id}/parts",
        json={"part_numbers": [1]},
    )
    assert parts_b.status_code == 403

    # User A aborts upload
    abort_resp = await client_a.delete(f"/v1/assets/uploads/{upload_id}")
    assert abort_resp.status_code == 200
    assert abort_resp.json()["status"] == "aborted"

    # Presigning on aborted upload fails
    parts_after_abort = await client_a.post(
        f"/v1/assets/uploads/{upload_id}/parts",
        json={"part_numbers": [1]},
    )
    assert parts_after_abort.status_code == 400


@pytest.mark.asyncio
async def test_upload_complete_and_asset_creation(auth_client):
    client, _user_id = auth_client

    proj_resp = await client.post(
        "/v1/projects",
        json={"name": "Complete Upload Project"},
    )
    project_id = proj_resp.json()["id"]

    # Start a 6 MiB upload (1 part of 6 MiB)
    upload_resp = await client.post(
        f"/v1/projects/{project_id}/assets/uploads",
        json={
            "filename": "take1.mp4",
            "size": 6 * 1024 * 1024,
            "fingerprint": "fp_take1",
        },
    )
    upload_data = upload_resp.json()
    upload_id = upload_data["upload_id"]
    part_url = upload_data["parts"][0]["url"]

    # Upload actual part content via presigned PUT to MinIO
    part_payload = b"0" * (6 * 1024 * 1024)
    async with httpx.AsyncClient() as s3_client:
        put_resp = await s3_client.put(part_url, content=part_payload)
        assert put_resp.status_code == 200
        etag = put_resp.headers["ETag"].strip('"')

    # Complete upload with W3C traceparent header
    complete_resp = await client.post(
        f"/v1/assets/uploads/{upload_id}/complete",
        headers={"traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"},
        json={
            "parts": [{"part_number": 1, "etag": etag}]
        },
    )
    assert complete_resp.status_code == 200
    complete_data = complete_resp.json()
    assert complete_data["status"] == "completed"
    assert complete_data["trace_id"] == "4bf92f3577b34da6a3ce929d0e0e4736"
    asset_id = complete_data["asset_id"]

    # Verify Asset can be retrieved
    asset_resp = await client.get(f"/v1/assets/{asset_id}")
    assert asset_resp.status_code == 200
    assert asset_resp.json()["status"] == "ingesting"
    assert asset_resp.json()["name"] == "take1.mp4"
