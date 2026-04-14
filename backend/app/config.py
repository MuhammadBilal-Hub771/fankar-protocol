"""
app/config.py
─────────────
Centralised settings loaded from the .env file.
All other modules import from here — never call os.getenv() directly.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Pydantic-Settings automatically reads values from the .env file
    and validates types at startup, so the app fails fast if anything
    is misconfigured rather than silently producing wrong results.
    """

    # ── Blockchain ─────────────────────────────────────────
    AI_SIGNER_PRIVATE_KEY: str
    CONTRACT_ADDRESS: str
    CHAIN_ID: int = 92533

    # ── Pinata IPFS ────────────────────────────────────────
    PINATA_API_KEY: str
    PINATA_API_SECRET: str

    # ── Server (optional overrides) ────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Returns a cached Settings singleton.
    Use FastAPI's Depends(get_settings) in endpoints, or call directly
    in service modules.
    """
    return Settings()  # type: ignore[call-arg]
