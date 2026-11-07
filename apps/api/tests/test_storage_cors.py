import boto3
import botocore.exceptions
import httpx
import pytest
from botocore.config import Config
from kerf.config import settings


@pytest.fixture(scope="module")
def s3_client():
    client = boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version="s3v4"),
    )
    # Ensure bucket exists
    try:
        client.head_bucket(Bucket=settings.S3_BUCKET)
    except (botocore.exceptions.ClientError, botocore.exceptions.ConnectionError):
        client.create_bucket(Bucket=settings.S3_BUCKET)
    return client


def test_minio_cors_preflight(s3_client) -> None:
    origin = "http://localhost:5173"
    preflight_url = f"{settings.S3_ENDPOINT}/{settings.S3_BUCKET}/cors-check.bin"

    with httpx.Client() as client:
        resp = client.options(
            preflight_url,
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "PUT",
                "Access-Control-Request-Headers": "Content-Type",
            },
        )
        assert resp.status_code == 204
        assert resp.headers.get("access-control-allow-origin") in (origin, "*")
        allowed_methods = resp.headers.get("access-control-allow-methods", "")
        assert "PUT" in allowed_methods


def test_browser_multipart_upload_cors_etag_exposed(s3_client) -> None:
    key = "browser-test/multipart-verify.bin"
    origin = "http://localhost:5173"

    # 1. Initiate multipart upload via S3 API
    init_resp = s3_client.create_multipart_upload(
        Bucket=settings.S3_BUCKET, Key=key
    )
    upload_id = init_resp["UploadId"]
    assert upload_id is not None

    try:
        # 2. Generate presigned part upload URL
        presigned_url = s3_client.generate_presigned_url(
            "upload_part",
            Params={
                "Bucket": settings.S3_BUCKET,
                "Key": key,
                "UploadId": upload_id,
                "PartNumber": 1,
            },
            HttpMethod="PUT",
        )
        assert presigned_url.startswith("http")

        # 3. Simulate browser-originated PUT request with Origin header
        payload = b"X" * (5 * 1024 * 1024)  # 5 MiB part
        with httpx.Client() as client:
            put_resp = client.put(
                presigned_url,
                content=payload,
                headers={
                    "Origin": origin,
                    "Content-Type": "application/octet-stream",
                },
            )
            assert put_resp.status_code == 200

            # 4. Verify CORS and ETag exposure
            assert put_resp.headers.get("access-control-allow-origin") in (
                origin,
                "*",
            )
            expose_headers = put_resp.headers.get(
                "access-control-expose-headers", ""
            )
            # ETag must be in exposed headers (case-insensitive) or wildcard
            assert "etag" in expose_headers.lower() or "*" in expose_headers

            etag = put_resp.headers.get("etag")
            assert etag is not None and len(etag) > 0

        # 5. Complete multipart upload
        complete_resp = s3_client.complete_multipart_upload(
            Bucket=settings.S3_BUCKET,
            Key=key,
            UploadId=upload_id,
            MultipartUpload={"Parts": [{"PartNumber": 1, "ETag": etag}]},
        )
        assert complete_resp["ResponseMetadata"]["HTTPStatusCode"] == 200
    finally:
        # Clean up object
        try:
            s3_client.delete_object(Bucket=settings.S3_BUCKET, Key=key)
        except botocore.exceptions.ClientError:
            pass
