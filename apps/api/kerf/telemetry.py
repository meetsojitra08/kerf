import secrets
from typing import Any


def extract_or_generate_traceparent(
    headers: dict[str, Any] | None = None,
) -> tuple[str, str]:
    """
    Extracts W3C traceparent (or generates a new one) and returns (traceparent, trace_id).
    Format: 00-{trace_id_32_hex}-{span_id_16_hex}-01
    """
    if headers:
        tp = headers.get("traceparent") or headers.get("Traceparent")
        if tp and isinstance(tp, str):
            parts = tp.strip().split("-")
            if len(parts) == 4 and len(parts[1]) == 32:
                return tp.strip(), parts[1]

    trace_id = secrets.token_hex(16)
    span_id = secrets.token_hex(8)
    traceparent = f"00-{trace_id}-{span_id}-01"
    return traceparent, trace_id
