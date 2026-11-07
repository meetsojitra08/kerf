import logging
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, EndpointConnectionError
from kerf.config import settings

logger = logging.getLogger("kerf.storage")


def get_s3_client(public: bool = False) -> Any:
    endpoint = settings.S3_PUBLIC_ENDPOINT if public else settings.S3_ENDPOINT
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version="s3v4"),
    )


def ensure_bucket_exists(bucket: str = settings.S3_BUCKET) -> None:
    client = get_s3_client(public=False)
    try:
        client.head_bucket(Bucket=bucket)
    except (ClientError, EndpointConnectionError):
        try:
            client.create_bucket(Bucket=bucket)
            logger.info("Created S3 bucket: %s", bucket)
        except (ClientError, EndpointConnectionError) as e:
            logger.warning("Could not create S3 bucket %s: %s", bucket, e)


def create_multipart_upload(
    key: str, bucket: str = settings.S3_BUCKET
) -> str:
    client = get_s3_client(public=False)
    resp = client.create_multipart_upload(Bucket=bucket, Key=key)
    return str(resp["UploadId"])


def generate_presigned_part_url(
    key: str,
    upload_id: str,
    part_number: int,
    bucket: str = settings.S3_BUCKET,
    expires_in: int = 3600,
) -> str:
    # Sign against S3_PUBLIC_ENDPOINT so browser Host header matches signature
    client = get_s3_client(public=True)
    url: str = client.generate_presigned_url(
        "upload_part",
        Params={
            "Bucket": bucket,
            "Key": key,
            "UploadId": upload_id,
            "PartNumber": part_number,
        },
        HttpMethod="PUT",
        ExpiresIn=expires_in,
    )
    return url


def generate_presigned_put_url(
    key: str,
    bucket: str = settings.S3_BUCKET,
    expires_in: int = 3600,
) -> str:
    client = get_s3_client(public=True)
    url: str = client.generate_presigned_url(
        "put_object",
        Params={"Bucket": bucket, "Key": key},
        HttpMethod="PUT",
        ExpiresIn=expires_in,
    )
    return url


def list_parts(
    key: str, upload_id: str, bucket: str = settings.S3_BUCKET
) -> list[dict[str, Any]]:
    client = get_s3_client(public=False)
    try:
        resp = client.list_parts(Bucket=bucket, Key=key, UploadId=upload_id)
        raw_parts = resp.get("Parts", [])
        return [
            {
                "part_number": p["PartNumber"],
                "etag": p["ETag"].strip('"'),
                "size": p["Size"],
            }
            for p in raw_parts
        ]
    except (ClientError, EndpointConnectionError) as e:
        logger.warning(
            "Failed to list parts for upload_id %s: %s", upload_id, e
        )
        return []


def complete_multipart_upload(
    key: str,
    upload_id: str,
    parts: list[dict[str, Any]],
    bucket: str = settings.S3_BUCKET,
) -> dict[str, Any]:
    client = get_s3_client(public=False)
    formatted_parts = [
        {"PartNumber": p["PartNumber"], "ETag": f'"{p["ETag"].strip(chr(34))}"'}
        for p in parts
    ]
    resp: dict[str, Any] = client.complete_multipart_upload(
        Bucket=bucket,
        Key=key,
        UploadId=upload_id,
        MultipartUpload={"Parts": formatted_parts},
    )
    return resp


def abort_multipart_upload(
    key: str, upload_id: str, bucket: str = settings.S3_BUCKET
) -> None:
    client = get_s3_client(public=False)
    try:
        client.abort_multipart_upload(
            Bucket=bucket, Key=key, UploadId=upload_id
        )
    except (ClientError, EndpointConnectionError) as e:
        logger.warning(
            "Failed to abort multipart upload %s: %s", upload_id, e
        )


def delete_object(key: str, bucket: str = settings.S3_BUCKET) -> None:
    client = get_s3_client(public=False)
    try:
        client.delete_object(Bucket=bucket, Key=key)
    except (ClientError, EndpointConnectionError) as e:
        logger.warning("Failed to delete object %s: %s", key, e)

