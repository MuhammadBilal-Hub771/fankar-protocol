# Fankar Protocol

> **Web3 Creator & Culture Protocol — AI-gated NFT minting for South Asian sports, memes, and digital art, settled on WireFluid.**

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Smart Contract](#5-smart-contract)
6. [Backend — AI Gatekeeper](#6-backend--ai-gatekeeper)
7. [Frontend](#7-frontend)
8. [Local Setup](#8-local-setup)
9. [End-to-End Mint Flow](#9-end-to-end-mint-flow)
10. [API Reference](#10-api-reference)
11. [Environment Variables](#11-environment-variables)
12. [Deployment](#12-deployment)
13. [Security Notes](#13-security-notes)

---

## 1. Overview

Fankar Protocol is a full-stack Web3 platform that lets creators mint five categories of sports & culture NFTs on the **WireFluid** EVM-compatible blockchain (Chain ID 92533). Every mint is gated by an **AI Gatekeeper** — a FastAPI backend that analysis the uploaded asset, pins it to **IPFS via Pinata**, and issues an **ECDSA signature** that the smart contract verifies before minting.

### Five Asset Categories

| Category | Description |
|---|---|
| **Kit Design** | Iconic cricket & sports jersey designs |
| **Gully2PSL** | Street cricket talent cards with bowling speed on-chain |
| **Viral Memes** | Tokenised internet moments, verified for originality |
| **Influencers** | Limited-edition creator drops with royalty perks |
| **Creators Hub** | Fine digital art and photography |

### Key Properties

- **AI-Gated Minting** — No valid backend signature → no mint. Prevents bots and spam.
- **70 / 15 / 15 Royalty Split** — Creator (70%), Brand/Club (15%), Fankar Treasury (15%).
- **On-chain Sport Metadata** — Bowling speed and uniqueness score stored per token.
- **Replay-Attack Protection** — Per-sender cryptographic nonces prevent signature reuse.
- **Hybrid Marketplace** — Buyers Marketplace shows real on-chain NFTs fetched from WireFluid, padded with curated mock listings.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser / MetaMask                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTP (ethers.js v6)
          ┌───────────▼───────────┐        ┌────────────────────┐
          │   Next.js Frontend    │        │  WireFluid RPC     │
          │   (App Router / TSX)  │◄──────►│  https://evm.      │
          │                       │        │  wirefluid.com     │
          │  • Sidebar            │        └─────────┬──────────┘
          │  • FankarMintStudio   │                  │
          │  • BuyersMarketplace  │          ┌───────▼──────────┐
          │  • AssetDetailsModal  │          │  FankarNFT.sol   │
          └─────────┬─────────────┘          │  (ERC-721 +      │
                    │ multipart/form-data     │   ERC-2981)      │
          ┌─────────▼─────────────┐          └──────────────────┘
          │   FastAPI Backend     │
          │   (AI Gatekeeper)     │
          │                       │
          │  1. AI Model Analysis │
          │  2. Pin to IPFS       │──────► Pinata / IPFS
          │  3. ECDSA Signature   │
          │  4. Return mint params│
          └───────────────────────┘
```

---

## 3. Tech Stack

### Frontend
| Technology | Version | Role |
|---|---|---|
| Next.js | 16.2.3 | React framework (App Router) |
| React | 19 | UI rendering |
| TypeScript | 5 | Type safety |
| TailwindCSS | 4 | Utility-first styling |
| ethers.js | 6 | MetaMask & contract interaction |

### Backend
| Technology | Version | Role |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | 0.115.6 | REST API framework |
| Uvicorn | 0.32.1 | ASGI server |
| Web3.py | 7.6.0 | Hash building & address utilities |
| eth-account | 0.13.4 | ECDSA signing |
| httpx | 0.28.1 | Async HTTP client (Pinata uploads) |
| Pydantic v2 | 2.10.4 | Settings & response models |

### Smart Contract
| Technology | Version | Role |
|---|---|---|
| Solidity | 0.8.24 | Smart contract language |
| OpenZeppelin Contracts | 5.x | ERC-721, ERC-2981, ECDSA, Ownable |
| Hardhat | 3 | Compilation & deployment |
| Viem | latest | Deployment scripts (TypeScript) |

### Infrastructure
| Service | Role |
|---|---|
| WireFluid EVM | Blockchain (Chain ID 92533, token: WIRE) |
| Pinata | IPFS pinning for images & metadata |
| MetaMask | Browser wallet |

---

## 4. Project Structure

```
fankar-protocol/
│
├── frontend/                    # Next.js application
│   ├── app/
│   │   ├── layout.tsx           # Root layout (Sidebar + TopBar)
│   │   ├── page.tsx             # View router (?view= param)
│   │   └── globals.css          # Neon Cyberpunk CSS variables
│   └── components/
│       ├── Sidebar.tsx          # 2-section URL-based navigation
│       ├── TopBar.tsx           # Network status + Connect Wallet
│       ├── FankarMintStudio.tsx # Dynamic minting form (5 categories)
│       ├── BuyersMarketplace.tsx# Hybrid NFT gallery (on-chain + mock)
│       ├── AssetDetailsModal.tsx# NFT detail modal + MetaMask buy flow
│       └── FankarNFT.json       # Contract ABI for ethers.js
│
├── backend/                     # FastAPI AI Gatekeeper
│   ├── app/
│   │   ├── main.py              # FastAPI app, /api/v1/mint-asset endpoint
│   │   ├── config.py            # Pydantic Settings (env vars)
│   │   ├── services/
│   │   │   ├── ipfs_service.py  # Async Pinata upload (file + JSON)
│   │   │   └── signer_service.py# ECDSA signature generation
│   │   └── models_hub/
│   │       ├── kit_design.py    # AI analysis — Kit Design
│   │       ├── gully2psl.py     # AI analysis — Gully2PSL
│   │       ├── viral_memes.py   # AI analysis — Viral Memes
│   │       ├── influencers.py   # AI analysis — Influencers
│   │       └── creators_hub.py  # AI analysis — Creators Hub
│   ├── scripts/
│   │   ├── verify_signer.py     # Diagnose AI signer key alignment
│   │   └── debug_hash.py        # Reconstruct + verify ECDSA hashes
│   ├── requirements.txt
│   └── .env.example
│
└── web3-contracts/              # Hardhat 3 project
    ├── contracts/
    │   └── FankarNFT.sol        # ERC-721 + ERC-2981 + AI-gated mint
    ├── scripts/
    │   ├── deploy.ts            # Deploy to WireFluid
    │   └── update-signer.ts     # Update aiSigner on deployed contract
    ├── hardhat.config.ts
    └── .env.example
```

---

## 5. Smart Contract

**File:** `web3-contracts/contracts/FankarNFT.sol`
**Deployed on:** WireFluid (Chain ID 92533)
**Contract Address:** `0x1ea087D98c3bfDec3eFd00c85E14F09727d30C69`

### Standards
- **ERC-721 URIStorage** — NFT with on-chain token URI
- **ERC-2981** — Marketplace-compatible royalty standard
- **Ownable** — Admin functions restricted to deployer
- **ReentrancyGuard** — Protection against re-entrant mint calls

### Key Functions

```solidity
// Primary mint function — called by the frontend via MetaMask
function mintFankarAsset(
    address creator,        // content creator wallet
    address brand,          // club / organiser wallet
    string  calldata uri,   // ipfs:// token URI from backend
    uint256 mintFee,        // WIRE fee (0 for free mints)
    uint256 _bowlingSpeed,  // km/h × 100 (e.g. 14500 = 145.00 km/h)
    uint256 _uniquenessScore, // 0–10000 (e.g. 9000 = 90.00%)
    uint256 nonce,          // one-time random number from backend
    bytes   calldata signature // ECDSA signature from AI Gatekeeper
) external payable returns (uint256 tokenId)

// Read functions
function totalMinted() external view returns (uint256)
function tokenURI(uint256 tokenId) external view returns (string)
function aiSigner() external view returns (address)
```

### Royalty Split (70 / 15 / 15)

Every paid mint distributes `msg.value` as:
- **70%** → `creator` address
- **15%** → `brand` address
- **15%** → Fankar Protocol treasury

### Signature Hash

The AI Gatekeeper signs the following packed hash (replicated in Python's `signer_service.py`):

```solidity
bytes32 hash = keccak256(abi.encodePacked(
    block.chainid,      // 92533
    address(this),      // contract address
    minter,             // msg.sender
    creator,
    brand,
    keccak256(bytes(uri)),
    mintFee,
    _bowlingSpeed,
    _uniquenessScore,
    nonce
));
// Then wrapped with EIP-191:
bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(hash);
```

### Custom Errors

| Error | Condition |
|---|---|
| `InvalidSignature()` | ECDSA recovered address ≠ `aiSigner` |
| `NonceAlreadyUsed()` | Nonce already spent by this sender |
| `ZeroAddress()` | `creator` or `brand` is `address(0)` |
| `FeeTooLow()` | `msg.value < mintFee` |
| `FeatureDisabled()` | Feature type not active |

---

## 6. Backend — AI Gatekeeper

**Directory:** `backend/`
**Base URL:** `http://127.0.0.1:8000`
**Interactive Docs:** `http://127.0.0.1:8000/docs`

### How it works

```
POST /api/v1/mint-asset
        │
        ├─ 1. Route file to AI model (based on feature_type)
        ├─ 2. Reject if AI score < threshold → HTTP 400
        ├─ 3. Pin image file to Pinata IPFS  → image CID
        ├─ 4. Build ERC-721 metadata JSON
        │      ├─ name, description, image (ipfs://)
        │      ├─ attributes: Uniqueness Score, Bowling Speed,
        │      │              AI Confidence, Listing Price
        │      └─ fankar: { feature_type, listing_price_wire, … }
        ├─ 5. Pin metadata JSON to Pinata   → token_uri (ipfs://)
        ├─ 6. Generate ECDSA signature
        │      └─ nonce = secrets.randbits(64)
        └─ 7. Return JSON response to frontend
```

### AI Model Hub

Each model in `app/models_hub/` exposes a single function:

```python
def analyze(file_bytes: bytes, filename: str) -> AnalysisResult:
    # Returns: uniqueness_score (int, 0-10000),
    #          bowling_speed (int, km/h × 100),
    #          confidence (float),
    #          is_valid (bool)
```

| Module | Feature Type | Checks |
|---|---|---|
| `kit_design.py` | `kit_design` | Image uniqueness |
| `gully2psl.py` | `gully2psl` | Bowling speed + player uniqueness |
| `viral_memes.py` | `viral_memes` | Meme originality |
| `influencers.py` | `influencers` | Creator profile uniqueness |
| `creators_hub.py` | `creators_hub` | Artwork authenticity |

### Signature Generation (`signer_service.py`)

Replicates Solidity's `abi.encodePacked` in Python:

```python
msg_hash = Web3.solidity_keccak(
    ["uint256", "address", "address", "address", "address", "bytes32",
     "uint256", "uint256", "uint256", "uint256"],
    [chain_id, contract_address, minter, creator, brand,
     keccak256(token_uri), mint_fee, bowling_speed, uniqueness_score, nonce]
)
# Wrap with EIP-191 prefix
signable = encode_defunct(primitive=msg_hash)
# Sign
signed = Account.sign_message(signable, private_key=AI_SIGNER_PRIVATE_KEY)
```

### Diagnostic Scripts

```bash
# Verify your AI_SIGNER_PRIVATE_KEY matches on-chain aiSigner
python scripts/verify_signer.py

# Reconstruct hash from known parameters to debug InvalidSignature errors
python scripts/debug_hash.py
```

---

## 7. Frontend

**Directory:** `frontend/`
**Framework:** Next.js 16 (App Router)
**Theme:** Neon Cyberpunk — deep blues, neon green (`#00ff88`), amber accents

### Routing

Navigation is URL-based using `?view=` search params. The sidebar pushes URLs via `useRouter`; `page.tsx` reads them via `useSearchParams`.

| URL | View |
|---|---|
| `/?view=marketplace` | Buyers Marketplace |
| `/?view=kit_design` | FankarMintStudio (Kit Design tab) |
| `/?view=gully2psl` | FankarMintStudio (Gully2PSL tab) |
| `/?view=viral_memes` | FankarMintStudio (Viral Memes tab) |
| `/?view=influencers` | FankarMintStudio (Influencers tab) |
| `/?view=creators_hub` | FankarMintStudio (Creators Hub tab) |

### Key Components

#### `Sidebar.tsx`
Two-section navigation:
- **EXPLORE** — Buyers Marketplace (gold accent, pulsing LIVE badge)
- **CREATOR STUDIO** — 5 minting categories (green accent)

Uses `useSearchParams` + `useRouter` for URL-based active state. Wrapped in `<Suspense>` to satisfy Next.js's streaming requirements.

#### `FankarMintStudio.tsx`
Dynamic minting form that switches inputs based on the active tab:

```
Kit Design    → Image + Title + Description + Price
Gully2PSL     → Image/Video + Player Name + Bowling Speed + Price
Viral Memes   → Image + Meme Title + Category + Price
Influencers   → Photo + Handle + Niche + Price
Creators Hub  → Artwork + Title + Medium + Price
```

**Mint flow:**
1. Connect MetaMask, switch to WireFluid
2. `POST /api/v1/mint-asset` with `FormData`
3. Parse response — **nonce is returned as a string** to preserve 64-bit precision beyond `Number.MAX_SAFE_INTEGER`
4. Call `contract.mintFankarAsset(...)` with `BigInt(nonce)`
5. Show success screen with Token ID, AI Score, and relevant tab stats

#### `BuyersMarketplace.tsx`
Hybrid NFT gallery:
- Calls `contract.totalMinted()` → loops `contract.tokenURI(i)` for each token
- Fetches IPFS metadata JSON per token (via Pinata gateway)
- Merges real on-chain NFTs (displayed first with `● VERIFIED` badge) with mock listings
- Filter tabs: All / Kit Design / Gully2PSL / Viral Memes / Influencers / Creators Hub
- Card click or BUY NOW → opens `AssetDetailsModal`

#### `AssetDetailsModal.tsx`
Full-screen overlay with:
- Full-size media rendering (detects `.mp4`/`.webm` → `<video>`, otherwise `<img>`)
- Three stat cards: Price, AI Score, Network
- Uniqueness progress bar
- 5-step MetaMask buy flow: `idle → connecting → switching → sending → confirming → success/error`
- Mock NFT simulation (demo-safe — plays through all steps without a real tx)

---

## 8. Local Setup

### Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **MetaMask** browser extension
- **Pinata** account (free tier is sufficient)
- **WIRE** tokens on WireFluid for gas fees

---

### Step 1 — Clone & navigate

```bash
git clone <repo-url>
cd fankar-protocol
```

---

### Step 2 — Backend

```bash
cd backend

# Create virtual environment
python -m venv ../.venv
../.venv/Scripts/activate        # Windows
# source ../.venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure secrets
cp .env.example .env
# Edit .env — fill in AI_SIGNER_PRIVATE_KEY, CONTRACT_ADDRESS,
#             CHAIN_ID, PINATA_API_KEY, PINATA_API_SECRET

# Start the server
uvicorn app.main:app --reload --reload-dir app --port 8000
```

Verify: open `http://127.0.0.1:8000/docs`

---

### Step 3 — Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Edit .env.local (already created) — verify contract address:
# NEXT_PUBLIC_CONTRACT_ADDRESS=0x1ea087D98c3bfDec3eFd00c85E14F09727d30C69

# Start dev server
npm run dev
```

Open: `http://localhost:3000`

---

### Step 4 — Smart Contract (optional, already deployed)

```bash
cd web3-contracts

npm install

# Configure secrets
cp .env.example .env
# Fill in DEPLOYER_PRIVATE_KEY, AI_SIGNER_ADDRESS, TREASURY_ADDRESS

# Compile
npx hardhat compile

# Deploy to WireFluid
npx hardhat --network wirefluid run scripts/deploy.ts

# If aiSigner needs updating
npx hardhat --network wirefluid run scripts/update-signer.ts
```

---

## 9. End-to-End Mint Flow

```
User                Frontend              Backend (AI Gatekeeper)         WireFluid
 │                     │                          │                           │
 │  Upload image +     │                          │                           │
 │  fill form ────────►│                          │                           │
 │                     │  POST /api/v1/mint-asset │                           │
 │                     │  (multipart FormData)    │                           │
 │                     │─────────────────────────►│                           │
 │                     │                          │ 1. AI model analysis      │
 │                     │                          │ 2. Pin image to IPFS      │
 │                     │                          │ 3. Build + pin metadata   │
 │                     │                          │ 4. Generate ECDSA sig     │
 │                     │◄─────────────────────────│                           │
 │                     │  { token_uri, signature, │                           │
 │                     │    nonce (string),        │                           │
 │                     │    uniqueness_score, … }  │                           │
 │  MetaMask popup ◄───│                          │                           │
 │  Confirm tx ───────►│                          │                           │
 │                     │  contract.mintFankarAsset(creator, brand,            │
 │                     │    token_uri, mintFee,    │                           │
 │                     │    bowlingSpeed,          │                           │
 │                     │    uniquenessScore,       │                           │
 │                     │    BigInt(nonce),         │                           │
 │                     │    signature)  ──────────────────────────────────►   │
 │                     │                          │   Verifies ECDSA sig      │
 │                     │                          │   Checks nonce (not used) │
 │                     │                          │   Splits royalties        │
 │                     │                          │   Mints ERC-721 token     │
 │                     │◄─────────────────────────────────────────────────── │
 │  Success screen ◄───│  { tokenId, tx hash }    │                           │
```

---

## 10. API Reference

### `POST /api/v1/mint-asset`

**Content-Type:** `multipart/form-data`

#### Request Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | Asset image or video |
| `feature_type` | string | Yes | `kit_design` \| `gully2psl` \| `viral_memes` \| `influencers` \| `creators_hub` |
| `minter_address` | string | Yes | MetaMask wallet address (checksummed) |
| `creator_address` | string | Yes | Creator wallet (use minter if same person) |
| `brand_address` | string | Yes | Brand/club wallet (use minter if none) |
| `name` | string | Yes | NFT title |
| `description` | string | Yes | NFT description |
| `mint_fee` | int | Yes | Fee in wei (0 for free mints) |
| `listing_price_wire` | float | No | Optional listing price in WIRE |
| `bowling_speed_input` | float | No | Manual bowling speed (Gully2PSL only, km/h) |

#### Response (200 OK)

```json
{
  "token_uri": "ipfs://bafkrei...",
  "signature": "0x2b0fa3...",
  "nonce": "15812155372856825853",
  "uniqueness_score": 9000,
  "bowling_speed": 0,
  "confidence": 0.97,
  "feature_type": "kit_design",
  "creator_address": "0xA74A02...",
  "brand_address": "0xA74A02..."
}
```

> **Important:** `nonce` is returned as a **string** to preserve 64-bit integer precision. In JavaScript, use `BigInt(response.nonce)` — never `Number(response.nonce)`.

#### Error Responses

| Code | Reason |
|---|---|
| 400 | AI model rejected the asset (low uniqueness score) |
| 422 | Missing or invalid form field |
| 500 | IPFS upload failed or signing error |

---

### `GET /`

Redirects to `/docs` (Swagger UI).

---

### `GET /docs`

Interactive Swagger documentation for all endpoints.

---

## 11. Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|---|---|---|
| `AI_SIGNER_PRIVATE_KEY` | Private key of the AI signing wallet. **Never expose.** | Yes |
| `CONTRACT_ADDRESS` | Deployed `FankarNFT` contract address on WireFluid | Yes |
| `CHAIN_ID` | WireFluid chain ID — must be `92533` | Yes |
| `PINATA_API_KEY` | Pinata API key for IPFS pinning | Yes |
| `PINATA_API_SECRET` | Pinata API secret | Yes |
| `HOST` | Uvicorn host (default: `0.0.0.0`) | No |
| `PORT` | Uvicorn port (default: `8000`) | No |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed `FankarNFT` contract address |

### Web3 Contracts (`web3-contracts/.env`)

| Variable | Description |
|---|---|
| `DEPLOYER_PRIVATE_KEY` | Wallet that pays gas for deployment |
| `AI_SIGNER_ADDRESS` | Public address of the AI signing wallet |
| `AI_SIGNER_KEY` | AI signer private key (only for `update-signer.ts`) |
| `TREASURY_ADDRESS` | Fankar Protocol treasury wallet (receives 15% royalties) |
| `CONTRACT_ADDRESS` | Filled after deployment — used by other scripts |

---

## 12. Deployment

### Deploy the Smart Contract

```bash
cd web3-contracts
npx hardhat --network wirefluid run scripts/deploy.ts
```

The script will print:
```
FankarNFT deployed at: 0x...
aiSigner set to:       0x...
```

Copy the contract address to:
- `frontend/.env.local` → `NEXT_PUBLIC_CONTRACT_ADDRESS`
- `backend/.env` → `CONTRACT_ADDRESS`

### Update `aiSigner` (if key rotated)

```bash
npx hardhat --network wirefluid run scripts/update-signer.ts
```

### Deploy Frontend (Vercel)

```bash
cd frontend
npm run build   # verify no errors first
```

Set environment variable in Vercel dashboard:
```
NEXT_PUBLIC_CONTRACT_ADDRESS = 0x...
```

### Deploy Backend (production)

```bash
# Production server (no --reload)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Use a reverse proxy (Nginx / Caddy) with HTTPS in front of Uvicorn for production.

---

## 13. Security Notes

| Risk | Mitigation |
|---|---|
| `AI_SIGNER_PRIVATE_KEY` exposure | Never in frontend, never in git. Backend only. |
| Signature replay attacks | Per-sender nonces tracked in `usedNonces` mapping on-chain |
| `address(0)` as creator/brand | Contract reverts with `ZeroAddress()` if either is zero |
| JavaScript nonce precision loss | Backend returns nonce as `string`; frontend uses `BigInt()` |
| CORS | Backend explicitly whitelists `http://localhost:3000` |
| IPFS mutability | Content-addressed CIDs — metadata cannot be altered post-mint |
| Reentrancy | `ReentrancyGuard` on `mintFankarAsset` |
| Stack too deep | Compiler uses `viaIR: true` for Yul-based code generation |

---

