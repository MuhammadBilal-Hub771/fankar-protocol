"""
scripts/debug_hash.py
─────────────────────
ONE-SHOT DIAGNOSIS for InvalidSignature() errors.

Given the exact parameters from a failed mintFankarAsset() transaction,
this script:
  1. Rebuilds the exact same keccak hash the Solidity contract computes.
  2. Recovers the Ethereum address that signed the provided signature bytes.
  3. Fetches the on-chain aiSigner address from the deployed contract.
  4. Compares all three and prints a clear diagnosis + fix instructions.

Run from the fankar-ai-service directory:
    python scripts/debug_hash.py

Fill in the PARAMS dict below with values from your failed transaction
(copy from the MetaMask error or from the browser network tab).
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

from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3

# ═══════════════════════════════════════════════════════════
#  ▼▼▼  FILL IN FROM YOUR FAILED TRANSACTION  ▼▼▼
# ═══════════════════════════════════════════════════════════
PARAMS = {
    # Who called mintFankarAsset (MetaMask wallet address)
    "minter":           "0xA74A026bEAd58597Ff4aA8131Ca019d363cF88cC",

    # The creator / brand passed in the contract call
    # (copy from apiData.creator_address / apiData.brand_address)
    "creator":          "0xA74A026bEAd58597Ff4aA8131Ca019d363cF88cC",
    "brand":            "0xA74A026bEAd58597Ff4aA8131Ca019d363cF88cC",

    # The IPFS token URI (copy from apiData.token_uri)
    # Decoded from the tx data — edit if different
    "token_uri":        "ipfs://bafkreicmsiwogoa fbve3l7nh735potth4qt6ectdyan5sy4p74jsugn fn4",

    "mint_fee":         0,
    "bowling_speed":    0,
    "uniqueness_score": 8500,   # 0x2134

    # nonce from the tx  (0x0e8b1ee68e16c500 in decimal)
    "nonce":            1050523745948999424,

    # The 65-byte ECDSA signature bytes from the tx
    "signature":        "0xc9ad491ab0628937f0389826206aaa6076456b7ccef58db0d8f6335df84822b27f09a7dd9c79e682fed64a5846e6ba1ac0a5e6b6234980b0a6e50908d5b7be4b1b",
}
# ═══════════════════════════════════════════════════════════
#  ▲▲▲  END OF EDITABLE SECTION  ▲▲▲
# ═══════════════════════════════════════════════════════════

CONTRACT_ADDRESS      = os.getenv("CONTRACT_ADDRESS", "")
CHAIN_ID              = int(os.getenv("CHAIN_ID", "92533"))
AI_SIGNER_PRIVATE_KEY = os.getenv("AI_SIGNER_PRIVATE_KEY", "")

ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

SEP = "─" * 55

def main() -> None:
    print(f"\n{SEP}")
    print("  Fankar Protocol — InvalidSignature Debugger")
    print(f"{SEP}\n")

    if not CONTRACT_ADDRESS:
        print("ERROR: CONTRACT_ADDRESS not set in .env"); sys.exit(1)
    if not AI_SIGNER_PRIVATE_KEY:
        print("ERROR: AI_SIGNER_PRIVATE_KEY not set in .env"); sys.exit(1)

    w3 = Web3()  # no provider needed for hash operations

    # ── Step 1: checksum all addresses ────────────────────
    try:
        chk_minter   = Web3.to_checksum_address(PARAMS["minter"])
        chk_creator  = Web3.to_checksum_address(PARAMS["creator"])
        chk_brand    = Web3.to_checksum_address(PARAMS["brand"])
        chk_contract = Web3.to_checksum_address(CONTRACT_ADDRESS)
    except Exception as exc:
        print(f"ERROR: bad address — {exc}"); sys.exit(1)

    print("  Parameters used for hash:")
    print(f"    chain_id  = {CHAIN_ID}")
    print(f"    contract  = {chk_contract}")
    print(f"    minter    = {chk_minter}")
    print(f"    creator   = {chk_creator}")
    print(f"    brand     = {chk_brand}")
    print(f"    token_uri = {PARAMS['token_uri'][:60]}...")
    print(f"    mint_fee  = {PARAMS['mint_fee']}")
    print(f"    bowling   = {PARAMS['bowling_speed']}")
    print(f"    unique    = {PARAMS['uniqueness_score']}")
    print(f"    nonce     = {PARAMS['nonce']}")

    # ── Step 2: Rebuild the raw hash (mirrors _buildMintHash) ─
    uri_hash: bytes = Web3.keccak(text=PARAMS["token_uri"])

    raw_hash: bytes = Web3.solidity_keccak(
        ["uint256", "address", "address", "address", "address",
         "bytes32", "uint256", "uint256", "uint256", "uint256"],
        [
            int(CHAIN_ID),
            chk_contract,
            chk_minter,
            chk_creator,
            chk_brand,
            uri_hash,
            int(PARAMS["mint_fee"]),
            int(PARAMS["bowling_speed"]),
            int(PARAMS["uniqueness_score"]),
            int(PARAMS["nonce"]),
        ],
    )
    print(f"\n  Raw hash (pre-EIP191): 0x{raw_hash.hex()}")

    # ── Step 3: Wrap with EIP-191 (mirrors toEthSignedMessageHash) ─
    eip191_msg  = encode_defunct(primitive=raw_hash)
    final_bytes = b"".join(eip191_msg)
    final_hash  = Web3.keccak(final_bytes)
    print(f"  EIP-191 hash:          0x{final_hash.hex()}")

    # ── Step 4: Recover the signer from the signature ─────
    sig_hex = PARAMS["signature"]
    try:
        recovered = Account.recover_message(eip191_msg, signature=sig_hex)
    except Exception as exc:
        print(f"\n  ERROR: Could not recover signer from signature — {exc}")
        print("  The signature bytes may be malformed.")
        sys.exit(1)

    # ── Step 5: Derive address from our private key ────────
    our_signer = Account.from_key(AI_SIGNER_PRIVATE_KEY).address

    # ── Step 6: Read on-chain aiSigner ────────────────────
    on_chain_signer = "(could not fetch)"
    try:
        rpc_w3 = Web3(Web3.HTTPProvider("https://evm.wirefluid.com", request_kwargs={"timeout": 10}))
        abi = [{"name":"aiSigner","type":"function","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"address"}]}]
        ctr = rpc_w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=abi)
        on_chain_signer = ctr.functions.aiSigner().call()
    except Exception as exc:
        print(f"  (Warning: could not query on-chain aiSigner — {exc})")

    # ── Step 7: Report ─────────────────────────────────────
    print(f"\n{SEP}")
    print("  DIAGNOSIS")
    print(f"{SEP}")
    print(f"  Recovered from signature : {recovered}")
    print(f"  Our AI_SIGNER_PRIVATE_KEY: {our_signer}")
    print(f"  On-chain aiSigner        : {on_chain_signer}")
    print()

    sig_matches_our_key    = recovered.lower() == our_signer.lower()
    sig_matches_on_chain   = recovered.lower() == str(on_chain_signer).lower()
    our_key_matches_chain  = our_signer.lower() == str(on_chain_signer).lower()

    if sig_matches_our_key and sig_matches_on_chain:
        print("  ✅ All three addresses match — the signature SHOULD be valid.")
        print("     If the contract still reverts, check nonce reuse or chain ID.")
    else:
        print("  ❌ MISMATCH DETECTED:\n")

        if not sig_matches_our_key:
            print("  [!] Recovered address ≠ our AI_SIGNER_PRIVATE_KEY")
            print("      → The signature was produced by a DIFFERENT private key.")
            print("        Make sure the FastAPI server was reloaded AFTER the last .env change.")
            print("        Stale uvicorn process may still use the old key.\n")

        if not sig_matches_on_chain:
            print("  [!] Recovered address ≠ on-chain aiSigner")
            print(f"      → Contract will always revert with InvalidSignature().")
            print(f"      → Fix: update the contract's aiSigner to: {recovered}\n")

        if not our_key_matches_chain:
            print("  [!] AI_SIGNER_PRIVATE_KEY derives to a different address than aiSigner on-chain")
            print(f"      On-chain : {on_chain_signer}")
            print(f"      Our key  : {our_signer}")

        print(f"{SEP}")
        print("  HOW TO FIX:")
        print(f"{SEP}")

        if not sig_matches_on_chain:
            fix_addr = recovered  # the address that actually signed
            print(f"\n  Option A — Update the contract (recommended):")
            print(f"    cd web3-contracts")
            print(f"    # Add to .env:")
            print(f"    NEW_AI_SIGNER_ADDRESS={fix_addr}")
            print(f"    npx hardhat --network wirefluid run scripts/update-signer.ts\n")

        if not sig_matches_our_key:
            print(f"  Option B — Restart the FastAPI server to reload the .env:")
            print(f"    # Kill any running uvicorn processes then:")
            print(f"    uvicorn app.main:app --reload --port 8000\n")

    print(f"{SEP}\n")

if __name__ == "__main__":
    main()
