// ============================================================
//  Fankar Protocol — Update AI Signer Script
//  Target : WireFluid EVM  (Chain ID 92533)
//
//  PURPOSE
//  ───────
//  The contract was deployed with AI_SIGNER_ADDRESS as the on-chain
//  `aiSigner`.  Every mint signature is produced by the private key
//  AI_SIGNER_KEY (backend) — both must derive to the SAME address.
//  If they don't, every mintFankarAsset call reverts with 0x8baa579f
//  (InvalidSignature).
//
//  This script:
//    1. Derives the correct public address from AI_SIGNER_KEY.
//    2. Reads the current on-chain aiSigner.
//    3. If they differ, calls setAiSigner() to update the contract.
//
//  Run:
//    cd web3-contracts
//    npx hardhat --network wirefluid run scripts/update-signer.ts
//
//  Required .env keys (web3-contracts/.env):
//    DEPLOYER_PRIVATE_KEY   — owner wallet (pays gas)
//    AI_SIGNER_KEY          — the backend signing private key
//    CONTRACT_ADDRESS       — deployed FankarNFT address
// ============================================================

import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

// ── Chain definition ─────────────────────────────────────

const wirefluid = defineChain({
  id: 92_533,
  name: "WireFluid",
  nativeCurrency: { name: "WIRE", symbol: "WIRE", decimals: 18 },
  rpcUrls: { default: { http: ["https://evm.wirefluid.com"] } },
  blockExplorers: {
    default: { name: "WireFluid Explorer", url: "https://explorer.wirefluid.com" },
  },
});

// ── Minimal ABI ──────────────────────────────────────────

const ABI = [
  {
    name: "aiSigner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "setAiSigner",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "newSigner", type: "address" }],
    outputs: [],
  },
] as const;

// ── Helper ───────────────────────────────────────────────

function requireEnv(key: string): `0x${string}` {
  const v = process.env[key];
  if (!v || v.trim() === "")
    throw new Error(`Missing .env key: ${key}`);
  return v.trim() as `0x${string}`;
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  const SEP = "─".repeat(56);

  console.log(`\n${SEP}`);
  console.log("  Fankar Protocol — setAiSigner alignment check");
  console.log(`${SEP}\n`);

  // ── 1. Load keys ────────────────────────────────────────
  const deployerKey  = requireEnv("DEPLOYER_PRIVATE_KEY");
  const aiSignerKey  = requireEnv("AI_SIGNER_KEY");          // backend signing key
  const contractAddr = requireEnv("CONTRACT_ADDRESS");

  const deployer    = privateKeyToAccount(deployerKey);
  // Derive the CORRECT public address straight from AI_SIGNER_KEY —
  // no copy-paste, no human error possible.
  const correctSigner = privateKeyToAccount(aiSignerKey);

  console.log(`  Deployer (owner)   : ${deployer.address}`);
  console.log(`  AI_SIGNER_KEY →    : ${correctSigner.address}   ← this is what the backend signs with`);
  console.log(`  Contract           : ${contractAddr}`);

  // ── 2. Set up clients ───────────────────────────────────
  const publicClient = createPublicClient({
    chain: wirefluid,
    transport: http("https://evm.wirefluid.com"),
  });

  const walletClient = createWalletClient({
    chain: wirefluid,
    transport: http("https://evm.wirefluid.com"),
    account: deployer,
  });

  // ── 3. Read on-chain state ───────────────────────────────
  const onChainSigner = await publicClient.readContract({
    address: contractAddr,
    abi: ABI,
    functionName: "aiSigner",
  });

  const onChainOwner = await publicClient.readContract({
    address: contractAddr,
    abi: ABI,
    functionName: "owner",
  });

  console.log(`\n  On-chain aiSigner  : ${onChainSigner}`);
  console.log(`  On-chain owner     : ${onChainOwner}`);

  // ── 4. Check alignment ──────────────────────────────────
  const alreadyCorrect =
    onChainSigner.toLowerCase() === correctSigner.address.toLowerCase();

  if (alreadyCorrect) {
    console.log("\n  ✅ aiSigner is already aligned with AI_SIGNER_KEY. Nothing to do.");
    console.log("     If you still get InvalidSignature(), restart the FastAPI server.");
    console.log(`\n${SEP}\n`);
    return;
  }

  console.log("\n  ❌ MISMATCH DETECTED");
  console.log(`     on-chain    : ${onChainSigner}`);
  console.log(`     should be   : ${correctSigner.address}`);
  console.log("\n  Calling setAiSigner() to fix...\n");

  // ── 5. Verify caller is owner ───────────────────────────
  if (deployer.address.toLowerCase() !== (onChainOwner as string).toLowerCase()) {
    throw new Error(
      `DEPLOYER_PRIVATE_KEY (${deployer.address}) is NOT the contract owner (${onChainOwner}).\n` +
      `Only the owner can call setAiSigner().`
    );
  }

  // ── 6. Send the update transaction ─────────────────────
  const txHash = await walletClient.writeContract({
    address: contractAddr,
    abi: ABI,
    functionName: "setAiSigner",
    args: [correctSigner.address],
  });

  console.log(`  Tx submitted : ${txHash}`);
  console.log("  Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status === "reverted") {
    throw new Error(`Transaction reverted. Hash: ${txHash}`);
  }

  // ── 7. Verify on-chain ───────────────────────────────────
  const updatedSigner = await publicClient.readContract({
    address: contractAddr,
    abi: ABI,
    functionName: "aiSigner",
  });

  if (updatedSigner.toLowerCase() !== correctSigner.address.toLowerCase()) {
    throw new Error("Post-update verification failed — something went wrong.");
  }

  console.log(`\n  ✅ aiSigner updated!`);
  console.log(`     Block : ${receipt.blockNumber}`);
  console.log(`     New aiSigner on-chain : ${updatedSigner}`);
  console.log("\n  Your AI service can now mint NFTs without InvalidSignature().");
  console.log(`\n${SEP}\n`);
}

main().catch((err: Error) => {
  console.error("\n❌  Error:", err.message);
  process.exit(1);
});
