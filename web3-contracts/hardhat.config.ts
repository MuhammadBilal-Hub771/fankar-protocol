// ============================================================
//  Fankar Protocol — Hardhat 3 Configuration
//  Target Network : WireFluid EVM
//    RPC   : https://evm.wirefluid.com
//    ID    : 92533
//    Token : WIRE
// ============================================================

import { defineConfig } from "hardhat/config";

/**
 * Hardhat 3 uses `defineConfig` for full TypeScript type safety.
 *
 * Secrets are loaded via `configVariable("VAR_NAME")` — Hardhat reads them
 * lazily from environment variables (or a `.env` file via `dotenv` in scripts),
 * so they are never embedded in source code.
 *
 * Run tasks:
 *   npx hardhat compile
 *   npx hardhat --network wirefluid run scripts/deploy.ts
 *   npx hardhat --network localhost run scripts/deploy.ts   ← local testing
 */
export default defineConfig({

  // ── Solidity Compiler ────────────────────────────────────
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        /**
         * 200 runs is a balanced default:
         *  • Lower value  → smaller bytecode  (better for very complex contracts)
         *  • Higher value → cheaper execution (better for frequently called fns)
         */
        runs: 200,
      },
      /**
       * "cancun" is required by OpenZeppelin 5.6+ which uses the `mcopy` opcode
       * (EIP-5656, introduced in the Cancun/Dencun upgrade).
       * WireFluid is an EVM-compatible chain that supports Cancun opcodes.
       * Downgrade to "paris" only if WireFluid explicitly lacks Cancun support.
       */
      evmVersion: "cancun",
      /**
       * IR-based code generation (Yul intermediate representation).
       * Required when functions exceed the Solidity 16-slot stack limit —
       * which happens in mintFankarAsset due to its 8 parameters plus locals.
       * viaIR also enables deeper cross-function optimisations.
       */
      viaIR: true,
    },
  },

  // ── Networks ─────────────────────────────────────────────
  networks: {

    /**
     * WireFluid Mainnet
     * ─────────────────
     * Docs   : https://wirefluid.com
     * RPC    : https://evm.wirefluid.com
     * Chain  : 92533
     * Token  : WIRE
     *
     * Usage:
     *   npx hardhat --network wirefluid run scripts/deploy.ts
     */
    wirefluid: {
      type: "http",
      url: "https://evm.wirefluid.com",
      chainId: 92533,
    },

    /**
     * WireFluid Testnet  (add RPC once available)
     * Uncomment and fill `url` when testnet details are published.
     */
    // wirefluidTestnet: {
    //   type: "http",
    //   url: configVariable("WIREFLUID_TESTNET_RPC_URL"),
    //   chainId: 925330,  // placeholder — verify with WireFluid docs
    // },

    /**
     * Hardhat in-process simulation — used for unit tests and local scripts.
     * No real ETH required; deterministic state every run.
     */
    localhost: {
      type: "edr-simulated",
      chainType: "l1",
    },
  },

  // ── Project Layout ───────────────────────────────────────
  paths: {
    sources  : "./contracts",   // Solidity source files
    tests    : "./test",        // Test files
    cache    : "./cache",       // Compiler cache
    artifacts: "./artifacts",   // ABI + bytecode output
  },
});
