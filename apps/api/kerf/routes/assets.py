import logging
import math
import os
import uuid
from typing import Any

from botocore.exceptions import ClientError, EndpointConnectionError
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from kerf.auth.security import get_current_user
from kerf.db.session import get_db
from kerf.models.asset import Asset, Upload
from kerf.models.project import Project
from kerf.models.user import User
from kerf.queue import enqueue_job
from kerf.services.idempotency import check_idempotency, record_idempotency
from kerf.services.storage import (
    abort_multipart_upload,
    complete_multipart_upload,
    create_multipart_upload,
    generate_presigned_part_url,
    list_parts,
)
from kerf.telemetry import extract_or_generate_traceparent
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("kerf.assets")

router = APIRouter(tags=["assets"])

MIN_PART_SIZE = 5 * 1024 * 1024  # 5 MiB S3 minimum
DEFAULT_PART_SIZE = 16 * 1024 * 1024  # 16 MiB default
MAX_PARTS = 10000


class CreateUploadRequest(BaseModel):
    filename: str = Field(..., min_length=1)
    size: int = Field(..., gt=0)
    fingerprint: str = Field(..., min_length=1)


class PresignedPart(BaseModel):
    part_number: int
    url: str


class CreateUploadResponse(BaseModel):
    upload_id: uuid.UUID
    part_size: int
    total_parts: int
    parts: list[PresignedPart]


class PresignPartsRequest(BaseModel):
    part_numbers: list[int] = Field(..., min_length=1, max_length=100)


class PresignPartsResponse(BaseModel):
    parts: list[PresignedPart]


class PartCompletion(BaseModel):
    part_number: int = Field(..., ge=1, le=10000)
    etag: str = Field(..., min_length=1)


class CompleteUploadRequest(BaseModel):
    parts: list[PartCompletion] = Field(..., min_length=1)


class CompleteUploadResponse(BaseModel):
    asset_id: uuid.UUID
    upload_id: uuid.UUID
    status: str
    trace_id: str


class UploadStatusResponse(BaseModel):
    upload_id: uuid.UUID
    project_id: uuid.UUID
    filename: str
    size: int
    part_size: int
    fingerprint: str
    status: str
    parts_done: list[dict[str, Any]]


class AssetResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    kind: str
    name: str | None
    storage_key: str
    proxy_key: str | None
    status: str


def calculate_part_size(file_size: int) -> int:
    """Calculates part size enforcing 5 MiB minimum and max 10,000 parts."""
    if file_size < MIN_PART_SIZE:
        return file_size
    needed_part_size = math.ceil(file_size / 9000)
    return max(DEFAULT_PART_SIZE, needed_part_size)


@router.post(
    "/projects/{project_id}/assets/uploads",
    response_model=CreateUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_upload(
    project_id: uuid.UUID,
    req: CreateUploadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
) -> Any:
    # Check idempotency cache
    if idempotency_key:
        cached = await check_idempotency(f"upload_start:{project_id}:{idempotency_key}")
        if cached:
            return cached

    # Verify project exists and belongs to current user
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: you do not own this project",
        )

    part_size = calculate_part_size(req.size)
    total_parts = math.ceil(req.size / part_size)
    if total_parts > MAX_PARTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed parts ({MAX_PARTS})",
        )

    upload_id = uuid.uuid4()
    safe_filename = os.path.basename(req.filename)
    storage_key = f"projects/{project_id}/raw/{upload_id}/{safe_filename}"

    # Initiate S3 multipart upload
    try:
        s3_upload_id = create_multipart_upload(storage_key)
    except (ClientError, EndpointConnectionError) as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage initialization failed: {e}",
        ) from e

    # Presign initial window of parts (up to 10)
    initial_count = min(total_parts, 10)
    parts = [
        PresignedPart(
            part_number=i,
            url=generate_presigned_part_url(storage_key, s3_upload_id, i),
        )
        for i in range(1, initial_count + 1)
    ]

    upload = Upload(
        id=upload_id,
        project_id=project_id,
        s3_upload_id=s3_upload_id,
        storage_key=storage_key,
        filename=safe_filename,
        size=req.size,
        part_size=part_size,
        parts_done=[],
        fingerprint=req.fingerprint,
        status="uploading",
    )
    db.add(upload)
    await db.commit()

    resp_data = {
        "upload_id": str(upload_id),
        "part_size": part_size,
        "total_parts": total_parts,
        "parts": [p.model_dump() for p in parts],
    }

    if idempotency_key:
        await record_idempotency(
            f"upload_start:{project_id}:{idempotency_key}", resp_data
        )

    return resp_data


@router.get("/assets/uploads/{upload_id}", response_model=UploadStatusResponse)
async def get_upload_status(
    upload_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    result = await db.execute(
        select(Upload, Project.owner_id)
        .join(Project, Upload.project_id == Project.id)
        .where(Upload.id == upload_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found"
        )
    upload, owner_id = row
    if owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden"
        )

    # Reconcile parts with S3
    if upload.status == "uploading":
        s3_parts = list_parts(upload.storage_key, upload.s3_upload_id)
        if s3_parts:
            upload.parts_done = s3_parts
            await db.commit()

    return UploadStatusResponse(
        upload_id=upload.id,
        project_id=upload.project_id,
        filename=upload.filename,
        size=upload.size,
        part_size=upload.part_size,
        fingerprint=upload.fingerprint,
        status=upload.status,
        parts_done=upload.parts_done,
    )


@router.post(
    "/assets/uploads/{upload_id}/parts",
    response_model=PresignPartsResponse,
)
async def presign_parts(
    upload_id: uuid.UUID,
    req: PresignPartsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    result = await db.execute(
        select(Upload, Project.owner_id)
        .join(Project, Upload.project_id == Project.id)
        .where(Upload.id == upload_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found"
        )
    upload, owner_id = row
    if owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden"
        )
    if upload.status != "uploading":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Upload is in {upload.status} state, cannot presign parts",
        )

    total_parts = math.ceil(upload.size / upload.part_size)
    for p in req.part_numbers:
        if p < 1 or p > total_parts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid part number {p} (valid range: 1 to {total_parts})",
            )

    parts = [
        PresignedPart(
            part_number=p,
            url=generate_presigned_part_url(
                upload.storage_key, upload.s3_upload_id, p
            ),
        )
        for p in req.part_numbers
    ]
    return PresignPartsResponse(parts=parts)


@router.post(
    "/assets/uploads/{upload_id}/complete",
    response_model=CompleteUploadResponse,
)
async def complete_upload(
    upload_id: uuid.UUID,
    req: CompleteUploadRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
) -> Any:
    if idempotency_key:
        cached = await check_idempotency(f"upload_complete:{upload_id}:{idempotency_key}")
        if cached:
            return cached

    result = await db.execute(
        select(Upload, Project.owner_id)
        .join(Project, Upload.project_id == Project.id)
        .where(Upload.id == upload_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found"
        )
    upload, owner_id = row
    if owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden"
        )

    traceparent, trace_id = extract_or_generate_traceparent(dict(request.headers))

    if upload.status == "completed":
        # Already completed, fetch created asset
        asset_res = await db.execute(
            select(Asset).where(
                Asset.project_id == upload.project_id,
                Asset.storage_key == upload.storage_key,
            )
        )
        existing_asset = asset_res.scalars().first()
        if existing_asset:
            return CompleteUploadResponse(
                asset_id=existing_asset.id,
                upload_id=upload.id,
                status="completed",
                trace_id=trace_id,
            )

    # Sort parts by part_number per S3 requirements
    sorted_parts = sorted(req.parts, key=lambda p: p.part_number)
    s3_formatted = [
        {"PartNumber": p.part_number, "ETag": p.etag} for p in sorted_parts
    ]

    try:
        complete_multipart_upload(
            upload.storage_key, upload.s3_upload_id, s3_formatted
        )
    except (ClientError, EndpointConnectionError) as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete multipart upload on storage: {e}",
        ) from e

    # Create Asset record
    asset = Asset(
        id=uuid.uuid4(),
        project_id=upload.project_id,
        kind="video",
        name=upload.filename,
        storage_key=upload.storage_key,
        status="ingesting",
    )
    db.add(asset)

    # Mark upload completed
    upload.status = "completed"
    upload.parts_done = [p.model_dump() for p in sorted_parts]
    await db.commit()

    # Enqueue Ingest Worker job with traceparent
    try:
        await enqueue_job(
            "ingest_asset",
            asset_id=str(asset.id),
            project_id=str(asset.project_id),
            storage_key=asset.storage_key,
            traceparent=traceparent,
        )
    except (ConnectionError, OSError) as e:
        logger.warning("Could not enqueue ingest job: %s", e)

    resp_data = {
        "asset_id": str(asset.id),
        "upload_id": str(upload.id),
        "status": "completed",
        "trace_id": trace_id,
    }

    if idempotency_key:
        await record_idempotency(
            f"upload_complete:{upload_id}:{idempotency_key}", resp_data
        )

    return resp_data


@router.delete("/assets/uploads/{upload_id}")
async def abort_upload(
    upload_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    result = await db.execute(
        select(Upload, Project.owner_id)
        .join(Project, Upload.project_id == Project.id)
        .where(Upload.id == upload_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found"
        )
    upload, owner_id = row
    if owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden"
        )

    try:
        abort_multipart_upload(upload.storage_key, upload.s3_upload_id)
    except (ClientError, EndpointConnectionError) as e:
        logger.warning("Failed to abort multipart upload in S3: %s", e)

    upload.status = "aborted"
    await db.commit()
    return {"upload_id": str(upload.id), "status": "aborted"}


@router.get("/assets/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    result = await db.execute(
        select(Asset, Project.owner_id)
        .join(Project, Asset.project_id == Project.id)
        .where(Asset.id == asset_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found"
        )
    asset, owner_id = row
    if owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden"
        )
    return AssetResponse(
        id=asset.id,
        project_id=asset.project_id,
        kind=asset.kind,
        name=asset.name,
        storage_key=asset.storage_key,
        proxy_key=asset.proxy_key,
        status=asset.status,
    )
