import uuid

import pytest
from kerf.db.ulid import (
    generate_ulid,
    generate_ulid_as_uuid,
    is_valid_ulid,
    ulid_to_uuid,
    uuid_to_ulid,
)


def test_ulid_uuid_roundtrip() -> None:
    for _ in range(100):
        original_uuid = uuid.uuid4()
        ulid_str = uuid_to_ulid(original_uuid)
        assert len(ulid_str) == 26
        assert is_valid_ulid(ulid_str)

        roundtripped = ulid_to_uuid(ulid_str)
        assert roundtripped == original_uuid


def test_ulid_generation() -> None:
    u1 = generate_ulid()
    u2 = generate_ulid()
    assert len(u1) == 26
    assert len(u2) == 26
    assert is_valid_ulid(u1)
    assert is_valid_ulid(u2)
    assert u1 != u2

    uuid_obj = generate_ulid_as_uuid()
    assert isinstance(uuid_obj, uuid.UUID)


def test_crockford_normalization() -> None:
    canonical = "01ARZ3NDEKTSV4RRFFQ69G5FAV"
    u_canon = ulid_to_uuid(canonical)

    # Test lowercase
    assert ulid_to_uuid(canonical.lower()) == u_canon

    # Test aliases: replace '0' with 'O' and '1' with 'I' or 'L'
    with_aliases = canonical.replace("0", "O").replace("1", "I")
    assert ulid_to_uuid(with_aliases) == u_canon


def test_ulid_validation_failures() -> None:
    assert not is_valid_ulid("too_short")
    assert not is_valid_ulid("01ARZ3NDEKTSV4RRFFQ69G5FAVU")  # 27 chars

    with pytest.raises(ValueError, match="ULID must be exactly 26 characters"):
        ulid_to_uuid("short")

    with pytest.raises(ValueError, match="Invalid Crockford Base32 character"):
        ulid_to_uuid("01ARZ3NDEKTSV4RRFFQ69G5FA$")
