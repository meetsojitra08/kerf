import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from kerf.models.base import Base

if TYPE_CHECKING:
    from kerf.models.project import Project


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    kind: Mapped[str] = mapped_column(
        String, default="video", nullable=False
    )  # video, audio, image, generated
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    storage_key: Mapped[str] = mapped_column(String, nullable=False)
    proxy_key: Mapped[str | None] = mapped_column(String, nullable=True)
    peaks_key: Mapped[str | None] = mapped_column(String, nullable=True)
    sprite_key: Mapped[str | None] = mapped_column(String, nullable=True)
    duration_us: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fps_num: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fps_den: Mapped[int | None] = mapped_column(Integer, nullable=True)
    codec: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(
        String, default="uploading", nullable=False
    )  # uploading, ingesting, ready_for_edit, indexed, failed
    provenance: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    checksum: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    project: Mapped["Project"] = relationship("Project", backref="assets")


class Upload(Base):
    __tablename__ = "uploads"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    s3_upload_id: Mapped[str] = mapped_column(String, nullable=False)
    storage_key: Mapped[str] = mapped_column(String, nullable=False)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    part_size: Mapped[int] = mapped_column(Integer, nullable=False)
    parts_done: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )
    fingerprint: Mapped[str] = mapped_column(
        String, nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String, default="uploading", nullable=False
    )  # uploading, completed, aborted, failed
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    project: Mapped["Project"] = relationship("Project", backref="uploads")
