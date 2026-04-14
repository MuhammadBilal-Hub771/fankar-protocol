"""
app/main.py
────────────
Fankar Protocol — AI Gatekeeper API

This FastAPI application acts as the secure middleware between users
and the FankarNFT smart contract.  Every mint must pass through here:

  1.  The uploaded file is routed to the correct AI model.
  2.  If the AI rejects it → HTTP 400 is returned immediately.
  3.  If approved → file is pinned to IPFS via Pinata.
  4.  An ERC-721 metadata JSON is built and also pinned to IPFS.
  5.  The AI signer generates an ECDSA signature over the mint params.
  6.  The frontend receives everything needed to call mintFankarAsset().

Run:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import logging
import secrets
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from app.config import get_settings
from app.models_hub import (
    creators_hub,
    gully2psl,
    influencers,
    kit_design,
    viral_memes,
)
from app.services.ipfs_service import IPFSUploadError, pin_file_to_ipfs, pin_json_to_ipfs
from app.services.signer_service import SigningError, generate_fankar_signature

# ──────────────────────────────────────────────────────────
#  Logging
# ──────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────
#  Feature → AI Model Router
# ──────────────────────────────────────────────────────────

# Maps the `feature_type` form field to the corresponding analysis module.
# Adding a new feature only requires adding one entry here + a new module file.
MODEL_ROUTER: dict[str, Any] = {
    "kit_design":    kit_design.analyze,
    "gully2psl":     gully2psl.analyze,
    "viral_memes":   viral_memes.analyze,
    "influencers":   influencers.analyze,
    "creators_hub":  creators_hub.analyze,
}

SUPPORTED_FEATURES = list(MODEL_ROUTER.keys())

# ──────────────────────────────────────────────────────────
#  FastAPI App
# ──────────────────────────────────────────────────────────

app = FastAPI(
    title="Fankar Protocol — AI Gatekeeper",
    description=(
        "Analyses creator assets, uploads them to IPFS, and issues ECDSA "
        "mint signatures for the FankarNFT smart contract on WireFluid."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────
# ALLOWED_ORIGINS env var lets you whitelist production domains without
# changing code. Set it in Render's environment dashboard as a
# comma-separated list, e.g.:
#   ALLOWED_ORIGINS=https://fankar-protocol.vercel.app,https://www.fankar.io
#
# If not set, the default list below is used (covers local dev + any
# Vercel preview/production URLs via the wildcard "*.vercel.app").
import os as _os
_raw_origins = _os.getenv("ALLOWED_ORIGINS", "")
_extra_origins: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

CORS_ORIGINS: list[str] = [
    # ── Local development ──
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # ── Vercel production (exact match) ──
    "https://fankar-protocol.vercel.app",
    # ── Any domains injected via ALLOWED_ORIGINS env var ──
    *_extra_origins,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    # Regex covers ALL Vercel preview/branch deploy URLs (*.vercel.app)
    # Note: allow_origin_regex is used for wildcard patterns; allow_origins
    # only accepts exact strings — globs like "*.vercel.app" are invalid there.
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ── Startup diagnostics ───────────────────────────────────
# Logs signer alignment on every server start so stale-code
# issues are immediately visible in the terminal.
@app.on_event("startup")
async def _startup_diagnostic() -> None:
    from eth_account import Account as _Acc
    _s = get_settings()
    _derived = _Acc.from_key(_s.AI_SIGNER_PRIVATE_KEY).address
    logger.info("=" * 56)
    logger.info("  Fankar AI Service v1.0 - startup diagnostics")
    logger.info("  Chain ID       : %s", _s.CHAIN_ID)
    logger.info("  Contract       : %s", _s.CONTRACT_ADDRESS)
    logger.info("  AI signer addr : %s", _derived)
    logger.info("=" * 56)

# ──────────────────────────────────────────────────────────
#  Response / Error Schemas
# ──────────────────────────────────────────────────────────

class MintAssetResponse(BaseModel):
    """
    Returned on a successful mint-asset request.
    The frontend passes these values directly to mintFankarAsset().
    """
    # ── IPFS ──
    image_cid:       str   # Raw IPFS CID of the uploaded file
    image_url:       str   # Full Pinata gateway URL for the image
    metadata_cid:    str   # Raw IPFS CID of the metadata JSON
    token_uri:       str   # "ipfs://<metadata_cid>" — the ERC-721 token URI

    # ── AI Scores ──
    uniqueness_score: int   # 0–10 000  (e.g. 8500 = 85.00 %)
    bowling_speed:    int   # km/h × 100; 0 if not applicable
    confidence:       float # Model confidence 0.0–1.0
    ai_verdict:       str   # Human-readable reason from the AI model

    # ── Signature (pass to contract) ──
    signature:        str   # 0x-prefixed 65-byte ECDSA signature
    # IMPORTANT: nonce is a STRING, not a number.
    # secrets.randbits(64) can produce values > 2^53 (JS Number.MAX_SAFE_INTEGER).
    # If Pydantic returned it as a JSON number, JS JSON.parse() would silently
    # round it to the nearest IEEE 754 double, making BigInt() produce the WRONG
    # nonce.  As a string it is parsed with BigInt("...") which is exact.
    nonce:            str   # Exact 64-bit nonce as a decimal string
    mint_fee:         int   # Required wei (0 = free mint)

    # ── Resolved addresses (MUST be forwarded verbatim to mintFankarAsset) ──
    # The signature was built over these exact checksum addresses.
    # Using any other value for creator/brand in the contract call will
    # produce a different on-chain hash → InvalidSignature revert.
    creator_address:  str
    brand_address:    str

    # ── Meta ──
    feature_type:     str
    minter_address:   str


class ErrorResponse(BaseModel):
    detail: str


# ──────────────────────────────────────────────────────────
#  Root  →  redirect to interactive docs
# ──────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    """Redirect browser visits to the Swagger UI."""
    return RedirectResponse(url="/docs")


# ──────────────────────────────────────────────────────────
#  Health Check
# ──────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health_check() -> dict[str, str]:
    """Returns 200 OK if the service is running."""
    settings = get_settings()
    return {
        "status": "ok",
        "service": "fankar-ai-service",
        "chain_id": str(settings.CHAIN_ID),
        "contract": settings.CONTRACT_ADDRESS,
    }


# ──────────────────────────────────────────────────────────
#  Core Endpoint
# ──────────────────────────────────────────────────────────

@app.post(
    "/api/v1/mint-asset",
    response_model=MintAssetResponse,
    status_code=status.HTTP_200_OK,
    tags=["Mint"],
    summary="Analyse, upload & sign a Fankar Protocol NFT asset",
    responses={
        400: {"model": ErrorResponse, "description": "AI rejected the asset or invalid input"},
        422: {"description": "Validation error in form fields"},
        502: {"model": ErrorResponse, "description": "IPFS upload failed"},
        500: {"model": ErrorResponse, "description": "Internal signing or server error"},
    },
)
async def mint_asset(
    file: UploadFile = File(
        ...,
        description="The asset file to mint (image, GIF, etc.).",
    ),
    feature_type: str = Form(
        ...,
        description=(
            f"Which Fankar feature this asset belongs to. "
            f"Allowed values: {SUPPORTED_FEATURES}"
        ),
    ),
    minter_address: str = Form(
        ...,
        description="The EVM wallet address of the person minting the NFT.",
    ),
    name: str = Form(
        ...,
        description="Display name for the NFT (stored in metadata).",
    ),
    description: str = Form(
        ...,
        description="A short description of the asset (stored in metadata).",
    ),
    creator_address: str | None = Form(
        default=None,
        description="Creator wallet address (defaults to minter if not set).",
    ),
    brand_address: str | None = Form(
        default=None,
        description="Brand/organiser wallet address (defaults to zero address).",
    ),
    mint_fee: int = Form(
        default=0,
        description="Required ETH in wei for this mint. 0 = free mint.",
        ge=0,
    ),
    listing_price_wire: float = Form(
        default=0.0,
        description="Desired secondary-market listing price in WIRE (stored in NFT metadata only, not enforced on-chain).",
        ge=0,
    ),
    bowling_speed_input: float = Form(
        default=0.0,
        description="User-provided bowling speed in km/h (Gully2PSL only). Stored in metadata and overrides the AI mock value.",
        ge=0,
    ),
) -> MintAssetResponse:
    """
    Full AI Gatekeeper pipeline:

    1. **Route** to the correct AI model based on `feature_type`.
    2. **Reject** with HTTP 400 if the AI marks the asset as invalid.
    3. **Upload** the file to Pinata IPFS.
    4. **Build** ERC-721 metadata JSON and upload it to Pinata IPFS.
    5. **Sign**  the mint parameters with the AI signer key.
    6. **Return** everything the frontend needs to call `mintFankarAsset()`.
    """

    # ── A. Validate feature_type ───────────────────────────
    feature_type = feature_type.strip().lower()
    if feature_type not in MODEL_ROUTER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unknown feature_type '{feature_type}'. "
                f"Supported values: {SUPPORTED_FEATURES}"
            ),
        )

    from datetime import datetime as _dt
    def _ts() -> str:
        return _dt.now().strftime("%H:%M:%S.%f")[:-3]

    print(f"\n[{_ts()}] {'-'*50}")
    print(f"[{_ts()}] [INFO] Image received from Frontend")
    print(f"[{_ts()}]        minter={minter_address}  file={file.filename}  feature={feature_type}")
    logger.info(
        "Mint request | minter=%s | feature=%s | file=%s",
        minter_address, feature_type, file.filename,
    )

    # ── B. Read file bytes ─────────────────────────────────
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    original_filename  = file.filename or "asset"
    file_content_type  = file.content_type or "application/octet-stream"

    # ── C. Run AI Analysis ─────────────────────────────────
    print(f"[{_ts()}] [INFO] Running AI analysis ({feature_type})...")
    analyze_fn = MODEL_ROUTER[feature_type]
    try:
        ai_result = analyze_fn(file_bytes, original_filename)
    except Exception as exc:
        logger.exception("AI model raised an unexpected error for feature '%s'", feature_type)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI analysis failed: {exc}",
        ) from exc

    # ── D. Reject if AI says the asset is invalid ──────────
    if not ai_result.is_valid:
        print(f"[{_ts()}] [WARN] AI rejected asset - {ai_result.reason}")
        logger.warning(
            "Asset rejected by AI | feature=%s | reason=%s",
            feature_type, ai_result.reason,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ai_result.reason,
        )

    print(f"[{_ts()}] [INFO] AI approved  uniqueness={ai_result.uniqueness_score}  bowling={ai_result.bowling_speed}")
    logger.info(
        "Asset approved by AI | uniqueness=%d | bowling_speed=%d",
        ai_result.uniqueness_score, ai_result.bowling_speed,
    )

    # ── E. Upload file to IPFS ─────────────────────────────
    print(f"[{_ts()}] [INFO] Pinata uploading...")
    try:
        image_result = await pin_file_to_ipfs(
            file_bytes=file_bytes,
            filename=original_filename,
            content_type=file_content_type,
        )
    except IPFSUploadError as exc:
        logger.error("IPFS file upload failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to upload asset to IPFS: {exc}",
        ) from exc

    image_ipfs_url = f"ipfs://{image_result.ipfs_hash}"

    # ── F. Build & upload ERC-721 metadata JSON ────────────
    # For Gully2PSL: use the user-entered bowling speed (×100 for precision)
    # instead of the mock AI value so the real player speed is stored on-chain.
    effective_bowling_speed = (
        int(bowling_speed_input * 100)
        if feature_type == "gully2psl" and bowling_speed_input > 0
        else ai_result.bowling_speed
    )

    metadata = _build_metadata(
        name=name,
        description=description,
        image_ipfs_url=image_ipfs_url,
        feature_type=feature_type,
        bowling_speed=effective_bowling_speed,
        uniqueness_score=ai_result.uniqueness_score,
        confidence=ai_result.confidence,
        listing_price_wire=listing_price_wire,
    )

    try:
        metadata_result = await pin_json_to_ipfs(
            metadata=metadata,
            pin_name=f"FankarNFT-{name[:40]}",
        )
    except IPFSUploadError as exc:
        logger.error("IPFS metadata upload failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to upload metadata to IPFS: {exc}",
        ) from exc

    token_uri = f"ipfs://{metadata_result.ipfs_hash}"

    # ── G. Generate ECDSA signature ────────────────────────
    print(f"[{_ts()}] [INFO] Generating ECDSA signature...")
    nonce = secrets.randbits(64)

    try:
        sig_result = generate_fankar_signature(
            minter_address=minter_address,
            token_uri=token_uri,
            mint_fee=mint_fee,
            bowling_speed=effective_bowling_speed,  # user-entered speed for Gully2PSL
            uniqueness_score=ai_result.uniqueness_score,
            nonce=nonce,
            creator_address=creator_address,
            brand_address=brand_address,
        )
    except SigningError as exc:
        logger.error("Signing failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signature generation failed: {exc}",
        ) from exc

    print(f"[{_ts()}] [INFO] Signature Created & Sending Response")
    print(f"[{_ts()}]        token_uri={token_uri}")
    print(f"[{_ts()}]        nonce={nonce}  signer={sig_result.signer_address}")
    print(f"[{_ts()}] {'-'*50}\n")

    logger.info(
        "Mint asset prepared | minter=%s | token_uri=%s | nonce=%d",
        minter_address, token_uri, nonce,
    )

    # ── H. Return full payload to the frontend ─────────────
    return MintAssetResponse(
        # IPFS
        image_cid=image_result.ipfs_hash,
        image_url=image_result.ipfs_url,
        metadata_cid=metadata_result.ipfs_hash,
        token_uri=token_uri,
        # AI — use effective_bowling_speed so the frontend BigInt() matches the signed value
        uniqueness_score=ai_result.uniqueness_score,
        bowling_speed=effective_bowling_speed,
        confidence=ai_result.confidence,
        ai_verdict=ai_result.reason,
        # Signature
        signature=sig_result.signature,
        nonce=str(sig_result.nonce),   # String keeps full 64-bit precision in JSON
        mint_fee=mint_fee,
        # Resolved addresses — frontend MUST pass these exact values to mintFankarAsset()
        creator_address=sig_result.resolved_creator,
        brand_address=sig_result.resolved_brand,
        # Meta
        feature_type=feature_type,
        minter_address=minter_address,
    )


# ──────────────────────────────────────────────────────────
#  Helper
# ──────────────────────────────────────────────────────────

def _build_metadata(
    name: str,
    description: str,
    image_ipfs_url: str,
    feature_type: str,
    bowling_speed: int,
    uniqueness_score: int,
    confidence: float,
    listing_price_wire: float = 0.0,
) -> dict:
    """
    Build an ERC-721 / OpenSea-compatible metadata JSON object.

    The `attributes` array stores all on-chain and AI-generated
    properties so they are visible in wallets and marketplaces.
    """
    attributes = [
        {"trait_type": "Feature",          "value": feature_type.replace("_", " ").title()},
        {"trait_type": "Uniqueness Score", "value": f"{uniqueness_score / 100:.2f}%"},
        {"trait_type": "AI Confidence",    "value": f"{confidence * 100:.1f}%"},
        {"trait_type": "Protocol",         "value": "Fankar Protocol"},
        {"trait_type": "Network",          "value": "WireFluid"},
    ]

    # Bowling speed — only for sports assets (Gully2PSL)
    if bowling_speed > 0:
        attributes.append({
            "trait_type": "Bowling Speed (km/h)",
            "value": f"{bowling_speed / 100:.2f}",
        })

    # Listing price — stored as metadata so marketplaces can surface it
    if listing_price_wire > 0:
        attributes.append({
            "trait_type": "Listing Price",
            "value":      f"{listing_price_wire} WIRE",
        })

    return {
        "name":        name,
        "description": description,
        "image":       image_ipfs_url,
        "attributes":  attributes,
        # Non-standard fankar namespace — useful for protocol indexers
        "fankar": {
            "feature_type":       feature_type,
            "uniqueness_score":   uniqueness_score,
            "bowling_speed":      bowling_speed,
            "listing_price_wire": listing_price_wire,
        },
    }
