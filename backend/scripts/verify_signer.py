"""
scripts/verify_signer.py
─────────────────────────
Diagnostic: derives the public address from AI_SIGNER_PRIVATE_KEY and
compares it to the on-chain aiSigner address.

Run from the fankar-ai-service directory:
    python scripts/verify_signer.py

Requirements: web3, python-dotenv (already in requirements.txt).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# ── Load .env ─────────────────────────────────────────────
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)
    print(f"Loaded .env from {env_path}\n")
else:
    print(f"Warning: .env not found at {env_path}. Reading from environment.\n")

# ── Read env vars ──────────────────────────────────────────
AI_SIGNER_PRIVATE_KEY = os.getenv("AI_SIGNER_PRIVATE_KEY", "")
CONTRACT_ADDRESS      = os.getenv("CONTRACT_ADDRESS", "")
CHAIN_ID              = int(os.getenv("CHAIN_ID", "92533"))

if not AI_SIGNER_PRIVATE_KEY:
    print("ERROR: AI_SIGNER_PRIVATE_KEY is not set in .env")
    sys.exit(1)

# ── Derive address from private key ───────────────────────
from eth_account import Account
from web3 import Web3

account = Account.from_key(AI_SIGNER_PRIVATE_KEY)
derived_address = account.address   # EIP-55 checksum address

print("─────────────────────────────────────────")
print("  Fankar AI Service — Signer Verification")
print("─────────────────────────────────────────")
print(f"  Private key     : {AI_SIGNER_PRIVATE_KEY[:8]}...{AI_SIGNER_PRIVATE_KEY[-6:]}")
print(f"  Derived address : {derived_address}")
print(f"  Contract        : {CONTRACT_ADDRESS}")
print(f"  Chain ID        : {CHAIN_ID}")

# ── Query on-chain aiSigner if an RPC is available ────────
try:
    w3 = Web3(Web3.HTTPProvider("https://evm.wirefluid.com"))

    ABI = [
        {
            "name": "aiSigner",
            "type": "function",
            "stateMutability": "view",
            "inputs": [],
            "outputs": [{"name": "", "type": "address"}],
        }
    ]

    contract = w3.eth.contract(
        address=Web3.to_checksum_address(CONTRACT_ADDRESS),
        abi=ABI,
    )
    on_chain_signer: str = contract.functions.aiSigner().call()

    print(f"\n  On-chain aiSigner : {on_chain_signer}")

    if derived_address.lower() == on_chain_signer.lower():
        print("\n  ✅ MATCH — Your AI_SIGNER_PRIVATE_KEY is correctly aligned with the contract.")
        print("     Signatures produced by this service will be accepted on-chain.")
    else:
        print("\n  ❌ MISMATCH — The derived address does NOT match the on-chain aiSigner.")
        print("     Every mint will revert with InvalidSignature() until this is fixed.")
        print("\n  ── How to fix ─────────────────────────────────────────────")
        print(f"  Option A (recommended):  Update the contract's aiSigner to {derived_address}")
        print(f"     Run from web3-contracts/:")
        print(f"       NEW_AI_SIGNER_ADDRESS={derived_address} npx hardhat --network wirefluid run scripts/update-signer.ts")
        print(f"\n  Option B:  Change AI_SIGNER_PRIVATE_KEY in fankar-ai-service/.env so it")
        print(f"             derives to {on_chain_signer}")
        print("─────────────────────────────────────────")
        sys.exit(1)

except Exception as exc:
    print(f"\n  Warning: Could not query on-chain signer ({exc})")
    print(f"  Derived address to set as aiSigner: {derived_address}")
    print(f"\n  Copy this address to web3-contracts/.env as AI_SIGNER_ADDRESS={derived_address}")
    print(f"  Then run:  npx hardhat --network wirefluid run scripts/update-signer.ts")

print("─────────────────────────────────────────\n")
