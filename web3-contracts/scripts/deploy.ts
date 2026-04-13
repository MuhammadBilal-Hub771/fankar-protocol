// ============================================================
//  Fankar Protocol — Deployment Script
//  Target : WireFluid EVM  (Chain ID 92533)
//
//  Run:
//    npx hardhat compile
//    npx hardhat --network wirefluid run scripts/deploy.ts
// ============================================================

import hre from "hardhat";
import {
  createPublicClient,
  createWalletClient,
  http,
  encodeDeployData,   // ← correct viem API for deployment encoding
  type Hex,
  type Address,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// ESM-safe __dirname equivalent (required in Node.js ESM modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// Load .env from the project root (one level above /scripts)
dotenv.config({ path: join(__dirname, "../.env") });

// ─────────────────────────────────────────────────────────
//  WireFluid Chain Definition
// ─────────────────────────────────────────────────────────

const wirefluid = defineChain({
  id: 92_533,
  name: "WireFluid",
  nativeCurrency: {
    name: "WIRE",
    symbol: "WIRE",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://evm.wirefluid.com"] },
  },
  blockExplorers: {
    default: {
      name: "WireFluid Explorer",
      url: "https://explorer.wirefluid.com",
    },
  },
});

// ─────────────────────────────────────────────────────────
//  Env Helper
// ─────────────────────────────────────────────────────────

/**
 * Reads a required environment variable.
 * Throws a descriptive error if it is missing or empty.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(
      `\n❌  Missing environment variable: ${key}\n` +
      `   Copy .env.example → .env and fill in all values.\n`
    );
  }
  return value.trim();
}

// ─────────────────────────────────────────────────────────
//  Main Deployment Function
// ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  🚀  Fankar Protocol — FankarNFT Deployment");
  console.log("═══════════════════════════════════════════════════\n");

  // ── 1. Load secrets from .env ──────────────────────────
  const deployerPrivateKey = requireEnv("DEPLOYER_PRIVATE_KEY") as Hex;
  const aiSignerAddress    = requireEnv("AI_SIGNER_ADDRESS")    as Address;
  const treasuryAddress    = requireEnv("TREASURY_ADDRESS")     as Address;

  console.log("📋  Deployment Parameters:");
  console.log(`    AI Signer  : ${aiSignerAddress}`);
  console.log(`    Treasury   : ${treasuryAddress}`);

  // ── 2. Set up viem clients ─────────────────────────────
  const account = privateKeyToAccount(deployerPrivateKey);

  console.log(`\n👛  Deployer Wallet : ${account.address}`);

  const publicClient = createPublicClient({
    chain: wirefluid,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: wirefluid,
    transport: http(),
  });

  // ── 3. Verify network connection ───────────────────────
  const chainId = await publicClient.getChainId();
  console.log(`🔗  Network        : WireFluid (Chain ID ${chainId})`);

  // ── 4. Check deployer balance ──────────────────────────
  const balance = await publicClient.getBalance({ address: account.address });
  const balanceWire = Number(balance) / 1e18;
  console.log(`💰  Balance        : ${balanceWire.toFixed(4)} WIRE`);

  if (balance === 0n) {
    throw new Error(
      "Deployer wallet has 0 WIRE balance.\n" +
      "Please fund the wallet before deploying."
    );
  }

  // ── 5. Load compiled artifact ─────────────────────────
  console.log("\n🔨  Reading compiled artifact...");
  const artifact = await hre.artifacts.readArtifact("FankarNFT");

  if (!artifact.bytecode || artifact.bytecode === "0x") {
    throw new Error(
      "Bytecode is empty — run `npx hardhat compile` before deploying."
    );
  }

  // Count public functions for info log
  const fnCount = (artifact.abi as Array<{ type: string }>)
    .filter((f) => f.type === "function").length;
  console.log(`    ABI functions: ${fnCount}`);

  // ── 6. Estimate deployment gas ─────────────────────────
  // FIX: use encodeDeployData + estimateGas (correct viem API for deployment)
  // estimateContractGas is only for calling functions on existing contracts.
  console.log("\n⛽  Estimating deployment gas...");

  const deployData = encodeDeployData({
    abi: artifact.abi,
    bytecode: artifact.bytecode as Hex,
    args: [aiSignerAddress, treasuryAddress], // FankarNFT(address _aiSigner, address _treasury)
  });

  const gasEstimate = await publicClient.estimateGas({
    account: account.address,
    data: deployData,
  });

  const gasPrice      = await publicClient.getGasPrice();
  const estimatedCost = gasEstimate * gasPrice;

  console.log(`    Gas Estimate : ${gasEstimate.toLocaleString()} units`);
  console.log(`    Gas Price    : ${Number(gasPrice) / 1e9} Gwei`);
  console.log(`    Est. Cost    : ${(Number(estimatedCost) / 1e18).toFixed(6)} WIRE`);

  // ── 7. Deploy the contract ─────────────────────────────
  console.log("\n📤  Sending deployment transaction...");

  const txHash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as Hex,
    args: [aiSignerAddress, treasuryAddress], // Both constructor args required
  });

  console.log(`\n✅  Transaction submitted!`);
  console.log(`    Tx Hash : ${txHash}`);

  // ── 8. Wait for on-chain confirmation ─────────────────
  console.log("\n⏳  Waiting for confirmation (1 block)...");

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  });

  if (receipt.status !== "success") {
    throw new Error(
      `Transaction failed on-chain.\nReceipt: ${JSON.stringify(receipt, null, 2)}`
    );
  }

  const contractAddress = receipt.contractAddress!;

  // ── 9. Post-deployment summary ─────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  ✨  FankarNFT Deployed Successfully!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`\n  Contract Address : ${contractAddress}`);
  console.log(`  Block Number     : ${receipt.blockNumber}`);
  console.log(`  Gas Used         : ${receipt.gasUsed.toLocaleString()} units`);
  console.log(`  Explorer         : ${wirefluid.blockExplorers.default.url}/address/${contractAddress}`);

  console.log(`
📋  Next Steps:
    1. Save the contract address in your .env → CONTRACT_ADDRESS=${contractAddress}
    2. Update the Fankar backend AI service with the new address.
    3. Test mintFankarAsset() on WireFluid with a valid AI signature.
  `);
}

// ─────────────────────────────────────────────────────────
//  Entry Point
// ─────────────────────────────────────────────────────────

main().catch((err: Error) => {
  console.error("\n❌  Deployment failed:\n", err.message ?? err);
  process.exit(1);
});
