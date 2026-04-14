"""
app/services/ipfs_service.py
─────────────────────────────
Async Pinata IPFS pinning service.

Uses httpx.AsyncClient so the FastAPI server never blocks while
waiting for Pinata — all other requests are handled concurrently.

Two public coroutines:
  • pin_file_to_ipfs  — uploads a raw file (image, video, etc.)
  • pin_json_to_ipfs  — uploads a JSON metadata object
"""

from __future__ import annotations

import io
import json
import logging
from dataclasses import dataclass
from datetime import datetime

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

# ── Pinata endpoints ──────────────────────────────────────
IPFS_GATEWAY        = "https://gateway.pinata.cloud/ipfs"
PINATA_PIN_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"
PINATA_PIN_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS"

# Timeout for every Pinata call (seconds)
REQUEST_TIMEOUT = 30


# ── Timestamp helper ──────────────────────────────────────
def _ts() -> str:
    return datetime.now().strftime("%H:%M:%S.%f")[:-3]


# ──────────────────────────────────────────────────────────
#  Custom Exception
# ──────────────────────────────────────────────────────────

class IPFSUploadError(Exception):
    """Raised when a Pinata upload fails for any reason."""


# ──────────────────────────────────────────────────────────
#  Result dataclass
# ──────────────────────────────────────────────────────────

@dataclass(frozen=True)
class IPFSResult:
    ipfs_hash: str   # e.g. "Qm..." or "bafkrei..."
    ipfs_url:  str   # Full Pinata gateway URL
    pin_size:  int   # Bytes stored on IPFS


# ──────────────────────────────────────────────────────────
#  Internal helper
# ──────────────────────────────────────────────────────────

def _pinata_headers() -> dict[str, str]:
    """Build Pinata auth headers from settings."""
    s = get_settings()
    return {
        "pinata_api_key":        s.PINATA_API_KEY,
        "pinata_secret_api_key": s.PINATA_API_SECRET,
    }


# ──────────────────────────────────────────────────────────
#  Public API  (async)
# ──────────────────────────────────────────────────────────

async def pin_file_to_ipfs(
    file_bytes:   bytes,
    filename:     str,
    content_type: str = "application/octet-stream",
) -> IPFSResult:
    """
    Async: upload a raw file to IPFS via Pinata.

    The server stays fully responsive while Pinata processes the upload
    because this coroutine yields control to the event loop during I/O.

    Args:
        file_bytes:   Raw file content.
        filename:     Original filename (shown on Pinata dashboard).
        content_type: MIME type (e.g. "image/png").

    Returns:
        IPFSResult with the IPFS hash and Pinata gateway URL.

    Raises:
        IPFSUploadError on any network or API error.
    """
    print(f"[{_ts()}] [INFO] Pinata uploading IMAGE '{filename}' ({len(file_bytes):,} bytes)...")
    logger.info("Uploading file '%s' (%d bytes) to IPFS...", filename, len(file_bytes))

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(
                PINATA_PIN_FILE_URL,
                headers=_pinata_headers(),
                files={
                    "file": (filename, io.BytesIO(file_bytes), content_type),
                },
                data={
                    "pinataMetadata": json.dumps({"name": filename}),
                },
            )
            response.raise_for_status()

    except httpx.TimeoutException as exc:
        raise IPFSUploadError(
            f"Pinata timed out after {REQUEST_TIMEOUT}s uploading '{filename}'."
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise IPFSUploadError(
            f"Pinata returned HTTP {exc.response.status_code}: {exc.response.text}"
        ) from exc
    except httpx.RequestError as exc:
        raise IPFSUploadError(
            f"Network error uploading file to Pinata: {exc}"
        ) from exc

    data = response.json()
    if "IpfsHash" not in data:
        raise IPFSUploadError(f"Pinata unexpected response: {data}")

    ipfs_hash = data["IpfsHash"]
    result = IPFSResult(
        ipfs_hash=ipfs_hash,
        ipfs_url=f"{IPFS_GATEWAY}/{ipfs_hash}",
        pin_size=data.get("PinSize", 0),
    )

    print(f"[{_ts()}] [INFO] Image pinned OK -> ipfs://{ipfs_hash}")
    logger.info("File pinned successfully → IPFS hash: %s", ipfs_hash)
    return result


async def pin_json_to_ipfs(
    metadata: dict,
    pin_name: str = "FankarNFT-Metadata",
) -> IPFSResult:
    """
    Async: upload a JSON metadata object to IPFS via Pinata.

    Args:
        metadata:  ERC-721 metadata dict.
        pin_name:  Label on the Pinata dashboard.

    Returns:
        IPFSResult with the IPFS hash and gateway URL.

    Raises:
        IPFSUploadError on any network or API error.
    """
    print(f"[{_ts()}] [INFO] Pinata uploading METADATA JSON (pin='{pin_name}')...")
    logger.info("Uploading metadata JSON to IPFS (name=%s)...", pin_name)

    payload = {
        "pinataContent":  metadata,
        "pinataMetadata": {"name": pin_name},
        "pinataOptions":  {"cidVersion": 1},
    }

    headers = _pinata_headers()
    headers["Content-Type"] = "application/json"

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(
                PINATA_PIN_JSON_URL,
                headers=headers,
                content=json.dumps(payload).encode(),
            )
            response.raise_for_status()

    except httpx.TimeoutException as exc:
        raise IPFSUploadError(
            f"Pinata timed out after {REQUEST_TIMEOUT}s uploading metadata JSON."
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise IPFSUploadError(
            f"Pinata returned HTTP {exc.response.status_code}: {exc.response.text}"
        ) from exc
    except httpx.RequestError as exc:
        raise IPFSUploadError(
            f"Network error uploading metadata JSON to Pinata: {exc}"
        ) from exc

    data = response.json()
    if "IpfsHash" not in data:
        raise IPFSUploadError(f"Pinata unexpected response: {data}")

    ipfs_hash = data["IpfsHash"]
    result = IPFSResult(
        ipfs_hash=ipfs_hash,
        ipfs_url=f"{IPFS_GATEWAY}/{ipfs_hash}",
        pin_size=data.get("PinSize", 0),
    )

    print(f"[{_ts()}] [INFO] Metadata pinned OK -> ipfs://{ipfs_hash}")
    logger.info("Metadata JSON pinned successfully → IPFS hash: %s", ipfs_hash)
    return result
