"""ULID <-> UUID conversion and generation helpers.

In Kerf, external IDs are ULIDs (Universally Unique Lexicographically Sortable Identifiers),
encoded as 26-character Crockford Base32 strings.
In PostgreSQL, IDs are stored natively as 128-bit `uuid` columns for optimal indexing,
foreign keys, and storage efficiency (16 bytes).

Both ULID and UUID are 128-bit unsigned integers:
- 48 bits: Unix timestamp in milliseconds
- 80 bits: Cryptographic randomness / monotonicity

This module provides bi-directional lossless conversion between ULID strings and Python `uuid.UUID`
instances without data loss or precision truncation.
"""

from __future__ import annotations

import os
import time
import uuid

# Crockford's Base32 character set (excludes I, L, O, U)
CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
_DECODE_MAP = {char: idx for idx, char in enumerate(CROCKFORD_BASE32)}
# Crockford normalization aliases: O/o -> 0, I/i/L/l -> 1
_DECODE_MAP.update({"O": 0, "o": 0, "I": 1, "i": 1, "L": 1, "l": 1})


def is_valid_ulid(ulid_str: str) -> bool:
    """Check whether a string is a valid 26-character Crockford Base32 ULID."""
    if not isinstance(ulid_str, str) or len(ulid_str.strip()) != 26:
        return False
    clean = ulid_str.strip().upper()
    return all(c in _DECODE_MAP for c in clean)


def ulid_to_uuid(ulid_str: str) -> uuid.UUID:
    """Convert a 26-character Crockford Base32 ULID string into an RFC 4122 uuid.UUID."""
    clean = ulid_str.strip().upper()
    if len(clean) != 26:
        raise ValueError(f"ULID must be exactly 26 characters, got {len(clean)} ('{ulid_str}')")

    val = 0
    for char in clean:
        if char not in _DECODE_MAP:
            raise ValueError(f"Invalid Crockford Base32 character '{char}' in ULID '{ulid_str}'")
        val = (val << 5) | _DECODE_MAP[char]

    if val >= (1 << 128):
        raise ValueError(f"ULID value overflows 128 bits: '{ulid_str}'")

    return uuid.UUID(int=val)


def uuid_to_ulid(u: uuid.UUID | str) -> str:
    """Convert an RFC 4122 uuid.UUID (or UUID string) into a 26-character Crockford Base32 ULID."""
    if isinstance(u, str):
        u = uuid.UUID(u)

    val = u.int
    chars: list[str] = []
    for _ in range(26):
        chars.append(CROCKFORD_BASE32[val & 0x1F])
        val >>= 5

    return "".join(reversed(chars))


def generate_ulid() -> str:
    """Generate a new 26-character Crockford Base32 ULID string (48-bit time + 80-bit random)."""
    timestamp_ms = int(time.time() * 1000)
    rand_bytes = os.urandom(10)
    val = (timestamp_ms << 80) | int.from_bytes(rand_bytes, byteorder="big")

    chars: list[str] = []
    for _ in range(26):
        chars.append(CROCKFORD_BASE32[val & 0x1F])
        val >>= 5

    return "".join(reversed(chars))


def generate_ulid_as_uuid() -> uuid.UUID:
    """Generate a new time-sortable ULID directly as a Python uuid.UUID instance."""
    return ulid_to_uuid(generate_ulid())
