"use client";

/**
 * WalletContext — single source of truth for MetaMask state.
 *
 * Consumed by TopBar (header button) and Sidebar (wallet panel) so both
 * components always reflect the same address without prop-drilling.
 *
 * Usage:
 *   import { useWallet } from "@/context/WalletContext";
 *   const { address, connect, disconnect, isConnected, shortAddress, balance } = useWallet();
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ethers } from "ethers";

// ── WireFluid network params ──────────────────────────────────
// Chain ID 92533 = 0x16975
const WIREFLUID_CHAIN = {
  chainId: "0x16975",
  chainName: "WireFluid",
  nativeCurrency: { name: "WIRE", symbol: "WIRE", decimals: 18 },
  rpcUrls: ["https://evm.wirefluid.com"],
  blockExplorerUrls: ["https://explorer.wirefluid.com"],
} as const;

// ── Helpers ───────────────────────────────────────────────────
function shorten(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Read-only RPC provider for balance queries (doesn't need MetaMask)
const rpcProvider = new ethers.JsonRpcProvider("https://evm.wirefluid.com");

async function fetchWireBalance(addr: string): Promise<string> {
  try {
    const raw = await rpcProvider.getBalance(addr);
    const formatted = parseFloat(ethers.formatEther(raw)).toFixed(3);
    return formatted;
  } catch {
    return "—";
  }
}

// ── Context shape ────────────────────────────────────────────
interface WalletState {
  address: string | null;
  shortAddress: string | null;
  balance: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  address: null,
  shortAddress: null,
  balance: null,
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
});

export function useWallet(): WalletState {
  return useContext(WalletContext);
}

// ── Provider ─────────────────────────────────────────────────
export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress]       = useState<string | null>(null);
  const [balance, setBalance]       = useState<string | null>(null);
  const [isConnecting, setConnecting] = useState(false);

  // ── Internal: set address + refresh balance ──────────────
  const applyAccount = useCallback(async (addr: string) => {
    setAddress(addr);
    setBalance(null);                     // show loading immediately
    const bal = await fetchWireBalance(addr);
    setBalance(bal);
  }, []);

  const clearAccount = useCallback(() => {
    setAddress(null);
    setBalance(null);
  }, []);

  // ── connect() ────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("MetaMask not found. Please install MetaMask and refresh.");
      return;
    }

    setConnecting(true);
    try {
      // 1. Request account access
      const eth = window.ethereum as {
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts.length) return;

      // 2. Switch to WireFluid (add chain if not yet added)
      try {
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: WIREFLUID_CHAIN.chainId }],
        });
      } catch (switchErr) {
        const err = switchErr as { code?: number };
        if (err.code === 4902) {
          // Chain not in MetaMask — add it
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [WIREFLUID_CHAIN],
          });
        }
        // If user rejected the switch we continue anyway — they stay on wrong chain
        // and minting will fail; that's acceptable UX (error shown during mint)
      }

      await applyAccount(accounts[0]);
    } finally {
      setConnecting(false);
    }
  }, [applyAccount]);

  // ── disconnect() — clears local state only ───────────────
  // MetaMask has no programmatic disconnect API; clearing our state is
  // sufficient to reset every UI element back to "not connected".
  const disconnect = useCallback(() => {
    clearAccount();
  }, [clearAccount]);

  // ── On mount: check if already authorised (no popup) ─────
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const eth = window.ethereum as {
      request: (args: { method: string }) => Promise<unknown>;
    };
    eth
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const list = accounts as string[];
        if (list.length) applyAccount(list[0]);
      })
      .catch(() => {/* silently skip if no permission */});
  }, [applyAccount]);

  // ── MetaMask event listeners ──────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const eth = window.ethereum as unknown as {
      on: (event: string, handler: (data: unknown) => void) => void;
      removeListener: (event: string, handler: (data: unknown) => void) => void;
    };

    const onAccountsChanged = (data: unknown) => {
      const accounts = data as string[];
      if (accounts.length) {
        applyAccount(accounts[0]);
      } else {
        clearAccount();
      }
    };

    eth.on("accountsChanged", onAccountsChanged);
    return () => eth.removeListener("accountsChanged", onAccountsChanged);
  }, [applyAccount, clearAccount]);

  return (
    <WalletContext.Provider
      value={{
        address,
        shortAddress: address ? shorten(address) : null,
        balance,
        isConnected: !!address,
        isConnecting,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
