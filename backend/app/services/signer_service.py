"""
app/services/signer_service.py
───────────────────────────────
Generates ECDSA signatures that authorise a mint on the FankarNFT
smart contract.

The hash produced here MUST match exactly what the Solidity contract
computes in `_buildMintHash()`:

    keccak256(abi.encodePacked(
        block.chainid,           // uint256
        address(this),           // address  (contract)
        minter,                  // address  (msg.sender)
        creator,                 // address
        brand,                   // address
        keccak256(bytes(uri)),   // bytes32
        mintFee,                 // uint256
        _bowlingSpeed,           // uint256
        _uniquenessScore,        // uint256
        nonce                    // uint256
    ))

CRITICAL CONSTRAINT
───────────────────
The `creator` and `brand` addresses returned in `SignatureResult` are
the exact values used when building the hash.  The frontend MUST pass
these same values to `mintFankarAsset()` — passing any different address
will produce a different on-chain hash and cause `InvalidSignature`.

After building the raw hash we wrap it with the EIP-191 prefix
("\x19Ethereum Signed Message:\n32") before signing — matching the
`MessageHashUtils.toEthSignedMessageHash()` call in the contract.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3

from app.config import get_settings

logger = logging.getLogger(__name__)

# Zero address — only used as a fallback when brand is truly absent.
# NOTE: the FankarNFT contract rejects address(0) for both creator and
# brand via `revert ZeroAddress()`.  Always pass a real wallet address.
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"


# ──────────────────────────────────────────────────────────
#  Custom Exception
# ──────────────────────────────────────────────────────────

class SigningError(Exception):
    """Raised when the ECDSA signing process fails."""


# ──────────────────────────────────────────────────────────
#  Result dataclass
# ──────────────────────────────────────────────────────────

@dataclass(frozen=True)
class SignatureResult:
    signature:        str  # 0x-prefixed hex signature (65 bytes = 130 hex chars)
    nonce:            int  # The nonce that was signed (pass this to the contract)
    signer_address:   str  # Public address of the AI signer (for verification)
    # ── These MUST be forwarded verbatim to mintFankarAsset() ──────────────
    resolved_creator: str  # Checksum address used when building the hash
    resolved_brand:   str  # Checksum address used when building the hash


# ──────────────────────────────────────────────────────────
#  Public API
# ──────────────────────────────────────────────────────────

def generate_fankar_signature(
    minter_address: str,
    token_uri: str,
    mint_fee: int,
    bowling_speed: int,
    uniqueness_score: int,
    nonce: int,
    creator_address: str | None = None,
    brand_address: str | None = None,
) -> SignatureResult:
    """
    Build and sign the FankarNFT mint authorisation hash.

    Args:
        minter_address:   The wallet address calling mintFankarAsset() (msg.sender).
        token_uri:        The IPFS metadata URI (e.g. "ipfs://Qm...").
        mint_fee:         Required ETH (in wei) for this mint. 0 = free mint.
        bowling_speed:    Bowling speed × 100 (e.g. 14500 = 145.00 km/h).
        uniqueness_score: AI rarity score 0–10000 (e.g. 8500 = 85.00%).
        nonce:            Unique per-sender nonce issued by this service.
        creator_address:  Creator wallet. Defaults to minter if None/empty.
                          ⚠ MUST be a non-zero address — the contract rejects
                          address(0) for creator with ZeroAddress().
        brand_address:    Brand wallet. Defaults to minter if None/empty.
                          ⚠ MUST be a non-zero address — same restriction.

    Returns:
        SignatureResult with the hex signature, nonce, signer address, and the
        exact creator/brand checksum addresses that were included in the hash.
        The caller MUST use `resolved_creator` and `resolved_brand` in the
        contract call — using any other values will invalidate the signature.

    Raises:
        SigningError: If any step of the signing process fails.
    """
    settings = get_settings()

    # ── Resolve optional addresses ─────────────────────────────────────────
    # The FankarNFT contract rejects address(0) for BOTH creator and brand
    # (line 260: `if (creator == address(0) || brand == address(0)) revert ZeroAddress()`).
    # Default both to minter for a self-mint so the caller never has to pass them.
    resolved_creator: str = creator_address if creator_address else minter_address
    resolved_brand:   str = brand_address   if brand_address   else minter_address

    # ── Normalise to EIP-55 checksum addresses ────────────────────────────
    try:
        checksum_minter   = Web3.to_checksum_address(minter_address)
        checksum_creator  = Web3.to_checksum_address(resolved_creator)
        checksum_brand    = Web3.to_checksum_address(resolved_brand)
        checksum_contract = Web3.to_checksum_address(settings.CONTRACT_ADDRESS)
    except (ValueError, TypeError) as exc:
        raise SigningError(f"Invalid Ethereum address provided: {exc}") from exc

    # ── Validate non-zero addresses (mirrors the Solidity revert) ─────────
    if checksum_creator == Web3.to_checksum_address(ZERO_ADDRESS):
        raise SigningError(
            "creator address resolved to address(0). "
            "Pass a real wallet address — the contract rejects ZeroAddress."
        )
    if checksum_brand == Web3.to_checksum_address(ZERO_ADDRESS):
        raise SigningError(
            "brand address resolved to address(0). "
            "Pass a real wallet address — the contract rejects ZeroAddress."
        )

    # ── keccak256(bytes(uri)) — mirrors Solidity's keccak256(bytes(uri)) ───
    # Web3.keccak(text=...) UTF-8-encodes the string then hashes, identical to
    # Solidity's `keccak256(bytes(uri))`.
    uri_hash: bytes = Web3.keccak(text=token_uri)

    # ── Build raw message hash ─────────────────────────────────────────────
    #
    # Web3.solidity_keccak() = keccak256(abi.encodePacked(...))
    #
    # ENCODING ORDER — verified against FankarNFT.sol _buildMintHash() lines 497-508
    # ┌──┬───────────────────────────┬──────────┬──────────────────────────────────┐
    # │  │ Solidity                  │ ABI type │ Python value                     │
    # ├──┼───────────────────────────┼──────────┼──────────────────────────────────┤
    # │1 │ block.chainid             │ uint256  │ int(settings.CHAIN_ID)  = 92533  │
    # │2 │ address(this)             │ address  │ checksum_contract                │
    # │3 │ minter  (msg.sender)      │ address  │ checksum_minter                  │
    # │4 │ creator                   │ address  │ checksum_creator                 │
    # │5 │ brand                     │ address  │ checksum_brand                   │
    # │6 │ keccak256(bytes(uri))     │ bytes32  │ uri_hash  (Web3.keccak(text=..)) │
    # │7 │ mintFee                   │ uint256  │ int(mint_fee)                    │
    # │8 │ _bowlingSpeed             │ uint256  │ int(bowling_speed)               │
    # │9 │ _uniquenessScore          │ uint256  │ int(uniqueness_score)            │
    # │10│ nonce                     │ uint256  │ int(nonce)                       │
    # └──┴───────────────────────────┴──────────┴──────────────────────────────────┘
    # All Solidity types are uint256 (NOT uint32/uint64) — confirmed in contract.
    try:
        raw_hash: bytes = Web3.solidity_keccak(
            ["uint256", "address", "address", "address", "address",
             "bytes32", "uint256", "uint256", "uint256", "uint256"],
            [
                int(settings.CHAIN_ID),  # 1. block.chainid
                checksum_contract,       # 2. address(this)
                checksum_minter,         # 3. minter / msg.sender
                checksum_creator,        # 4. creator
                checksum_brand,          # 5. brand
                uri_hash,                # 6. keccak256(bytes(uri))  — 32-byte digest
                int(mint_fee),           # 7. mintFee
                int(bowling_speed),      # 8. _bowlingSpeed
                int(uniqueness_score),   # 9. _uniquenessScore
                int(nonce),              # 10. nonce
            ],
        )
    except Exception as exc:
        raise SigningError(f"Failed to build solidity keccak hash: {exc}") from exc

    # ── Wrap with EIP-191 prefix ───────────────────────────────────────────
    # encode_defunct(primitive=<bytes>) produces:
    #   "\x19Ethereum Signed Message:\n32" + raw_hash  (then keccak256 inside sign_message)
    # This mirrors MessageHashUtils.toEthSignedMessageHash(msgHash) in the contract.
    eip191_message = encode_defunct(primitive=raw_hash)

    # ── Sign with AI signer private key ───────────────────────────────────
    try:
        signed = Account.sign_message(
            eip191_message,
            private_key=settings.AI_SIGNER_PRIVATE_KEY,
        )
    except Exception as exc:
        raise SigningError(f"eth_account signing failed: {exc}") from exc

    signer_address: str = Account.from_key(settings.AI_SIGNER_PRIVATE_KEY).address

    # ── Ensure 0x prefix on the signature hex ─────────────────────────────
    raw_sig_hex = signed.signature.hex()
    prefixed_sig = raw_sig_hex if raw_sig_hex.startswith("0x") else f"0x{raw_sig_hex}"

    logger.info(
        "Signature generated | signer=%s | nonce=%d | minter=%s | creator=%s | brand=%s",
        signer_address,
        nonce,
        checksum_minter,
        checksum_creator,
        checksum_brand,
    )

    return SignatureResult(
        signature=prefixed_sig,
        nonce=nonce,
        signer_address=signer_address,
        resolved_creator=checksum_creator,
        resolved_brand=checksum_brand,
    )
