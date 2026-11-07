from uuid import uuid4

import pytest
from kerf_schema import (
    Clip,
    Fps,
    Resolution,
    Timeline,
    Track,
)
from pydantic import ValidationError

# Valid ULID (26 chars, Crockford Base32)
SAMPLE_ULID_TIMELINE = "01ARZ3NDEKTSV4RRFFQ69G5FAV"
SAMPLE_ULID_TRACK = "01ARZ3NDEKTSV4RRFFQ69G5FA1"
SAMPLE_ULID_CLIP = "01ARZ3NDEKTSV4RRFFQ69G5FA2"


def test_timeline_model_validation() -> None:
    project_id = uuid4()
    timeline = Timeline(
        id=SAMPLE_ULID_TIMELINE,
        project_id=project_id,
        revision=0,
        fps=Fps(num=30, den=1),
        resolution=Resolution(w=1920, h=1080),
        sample_rate=48000,
        tracks=[
            Track(
                id=SAMPLE_ULID_TRACK,
                kind="video",
                name="V1",
                order=0,
                locked=False,
                muted=False,
                solo=False,
                clips=[
                    Clip(
                        id=SAMPLE_ULID_CLIP,
                        track_id=SAMPLE_ULID_TRACK,
                        start=0,
                        duration=5000000,  # 5 seconds in microseconds
                        source_in=0,
                        source_out=5000000,
                    )
                ],
            )
        ],
        markers=[],
    )

    assert str(timeline.id.root) == SAMPLE_ULID_TIMELINE
    assert timeline.tracks[0].clips[0].duration.root == 5000000


def test_timeline_rejects_negative_microseconds() -> None:
    with pytest.raises(ValidationError):
        Clip(
            id=SAMPLE_ULID_CLIP,
            track_id=SAMPLE_ULID_TRACK,
            start=-1000,  # Negative microseconds must be rejected
            duration=5000000,
        )


def test_timeline_rejects_invalid_ulid() -> None:
    with pytest.raises(ValidationError):
        Track(
            id="not-a-valid-ulid",
            kind="video",
            name="V1",
            order=0,
            locked=False,
            muted=False,
            solo=False,
            clips=[],
        )
