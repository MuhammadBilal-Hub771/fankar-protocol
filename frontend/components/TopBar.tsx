"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@/context/WalletContext";

// ── Clipboard inline SVG ──────────────────────────────────────
function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DisconnectIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ── Wallet dropdown ───────────────────────────────────────────
function WalletDropdown({
  address,
  shortAddress,
  balance,
  onDisconnect,
  onClose,
}: {
  address: string;
  shortAddress: string;
  balance: string | null;
  onDisconnect: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  function copyAddress() {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "calc(100% + 10px)",
        right: 0,
        width: "260px",
        background: "linear-gradient(180deg, rgba(10,22,40,0.98) 0%, rgba(5,11,20,0.98) 100%)",
        border: "1px solid rgba(0,255,136,0.2)",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 24px rgba(0,255,136,0.08)",
        backdropFilter: "blur(20px)",
        zIndex: 100,
        overflow: "hidden",
        animation: "fadeInUp 0.15s ease forwards",
      }}
    >
      {/* Address + balance header */}
      <div style={{
        padding: "16px",
        borderBottom: "1px solid rgba(0,255,136,0.08)",
      }}>
        {/* Avatar + short address */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <div style={{
            width: "34px", height: "34px", borderRadius: "50%",
            background: "linear-gradient(135deg, #00ff88 0%, #00b4ff 100%)",
            flexShrink: 0, opacity: 0.85,
          }} />
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2f0ff", fontFamily: "monospace" }}>
              {shortAddress}
            </div>
            <div style={{ fontSize: "11px", color: "var(--neon-green)", fontWeight: 600 }}>
              {balance !== null ? `${balance} WIRE` : "Loading…"}
            </div>
          </div>
        </div>

        {/* Full address (copyable) */}
        <button
          onClick={copyAddress}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            padding: "7px 10px",
            borderRadius: "8px",
            background: copied ? "rgba(0,255,136,0.08)" : "rgba(255,255,255,0.04)",
            border: copied ? "1px solid rgba(0,255,136,0.35)" : "1px solid rgba(255,255,255,0.07)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: copied ? "0 0 10px rgba(0,255,136,0.15)" : "none",
          }}
        >
          <span style={{
            fontSize: "11px",
            color: copied ? "var(--neon-green)" : "rgba(168,200,232,0.7)",
            fontFamily: "monospace",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            textAlign: "left",
          }}>
            {address}
          </span>
          <span style={{ color: copied ? "var(--neon-green)" : "rgba(168,200,232,0.5)", flexShrink: 0 }}>
            {copied ? <CheckIcon /> : <CopyIcon />}
          </span>
        </button>
        {copied && (
          <p style={{ fontSize: "10px", color: "var(--neon-green)", textAlign: "center", marginTop: "5px", letterSpacing: "0.05em" }}>
            ✓ Copied to clipboard!
          </p>
        )}
      </div>

      {/* Disconnect */}
      <button
        onClick={() => { onDisconnect(); onClose(); }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "13px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "rgba(255,100,100,0.8)",
          fontSize: "13px",
          fontWeight: 500,
          letterSpacing: "0.02em",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,60,60,0.06)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <DisconnectIcon />
        Disconnect Wallet
      </button>
    </div>
  );
}

// ── TopBar ────────────────────────────────────────────────────
export default function TopBar() {
  const { address, shortAddress, balance, isConnected, isConnecting, connect, disconnect } = useWallet();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [btnHovered, setBtnHovered]     = useState(false);

  return (
    <header
      style={{
        height: "64px",
        borderBottom: "1px solid rgba(0,255,136,0.1)",
        background: "linear-gradient(90deg, rgba(10,22,40,0.95) 0%, rgba(5,11,20,0.95) 100%)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Network status */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: "var(--neon-green)", boxShadow: "0 0 8px var(--neon-green)",
          display: "inline-block",
          animation: "pulseGreen 2s ease-in-out infinite",
        }} />
        <span style={{ fontSize: "12px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Network: <span style={{ color: "var(--neon-green)" }}>WireFluid</span>
        </span>
      </div>

      {/* Right side: gas + wallet */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Gas */}
        <div style={{
          fontSize: "12px", color: "var(--text-muted)",
          background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.12)",
          borderRadius: "8px", padding: "6px 14px", letterSpacing: "0.05em",
        }}>
          ⛽ Gas: <span style={{ color: "#fbbf24" }}>24 Gwei</span>
        </div>

        {/* Wallet button — relative so dropdown positions correctly */}
        <div style={{ position: "relative" }}>
          {isConnected && address && shortAddress ? (
            // ── Connected: show address + toggle dropdown ────
            <button
              onClick={() => setDropdownOpen(o => !o)}
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => setBtnHovered(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "7px 14px 7px 8px",
                borderRadius: "10px",
                background: dropdownOpen || btnHovered
                  ? "linear-gradient(135deg, rgba(0,255,136,0.18) 0%, rgba(0,180,255,0.13) 100%)"
                  : "linear-gradient(135deg, rgba(0,255,136,0.1) 0%, rgba(0,180,255,0.07) 100%)",
                border: "1px solid rgba(0,255,136,0.35)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: dropdownOpen || btnHovered ? "0 0 20px rgba(0,255,136,0.25)" : "none",
              }}
            >
              {/* Avatar dot */}
              <div style={{
                width: "24px", height: "24px", borderRadius: "50%",
                background: "linear-gradient(135deg, #00ff88 0%, #00b4ff 100%)",
                flexShrink: 0, opacity: 0.85,
              }} />

              <span style={{
                fontSize: "13px", fontWeight: 600,
                color: "var(--neon-green)", fontFamily: "monospace", letterSpacing: "0.04em",
              }}>
                {shortAddress}
              </span>

              {/* Chevron */}
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="var(--neon-green)" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                style={{
                  transition: "transform 0.2s",
                  transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          ) : (
            // ── Disconnected: show Connect Wallet ────────────
            <button
              onClick={connect}
              disabled={isConnecting}
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => setBtnHovered(false)}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                background: btnHovered
                  ? "linear-gradient(135deg, rgba(0,255,136,0.25) 0%, rgba(0,180,255,0.2) 100%)"
                  : "linear-gradient(135deg, rgba(0,255,136,0.15) 0%, rgba(0,180,255,0.1) 100%)",
                border: "1px solid rgba(0,255,136,0.4)",
                color: "var(--neon-green)",
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "0.05em",
                cursor: isConnecting ? "wait" : "pointer",
                transition: "all 0.2s ease",
                textTransform: "uppercase",
                boxShadow: btnHovered ? "0 0 20px rgba(0,255,136,0.3)" : "none",
                opacity: isConnecting ? 0.7 : 1,
              }}
            >
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}

          {/* Dropdown */}
          {dropdownOpen && isConnected && address && shortAddress && (
            <WalletDropdown
              address={address}
              shortAddress={shortAddress}
              balance={balance}
              onDisconnect={disconnect}
              onClose={() => setDropdownOpen(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
}
