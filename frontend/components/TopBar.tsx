"use client";

import { useState } from "react";

export default function TopBar() {
  const [hovered, setHovered] = useState(false);

  return (
    <header
      style={{
        height: "64px",
        borderBottom: "1px solid rgba(0,255,136,0.1)",
        background:
          "linear-gradient(90deg, rgba(10,22,40,0.95) 0%, rgba(5,11,20,0.95) 100%)",
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
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "var(--neon-green)",
            boxShadow: "0 0 8px var(--neon-green)",
            display: "inline-block",
            animation: "pulseGreen 2s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Network:{" "}
          <span style={{ color: "var(--neon-green)" }}>Mainnet Live</span>
        </span>
      </div>

      {/* Right side: gas + wallet */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            background: "rgba(0,255,136,0.05)",
            border: "1px solid rgba(0,255,136,0.12)",
            borderRadius: "8px",
            padding: "6px 14px",
            letterSpacing: "0.05em",
          }}
        >
          ⛽ Gas: <span style={{ color: "#fbbf24" }}>24 Gwei</span>
        </div>

        <button
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            padding: "8px 20px",
            borderRadius: "8px",
            background: hovered
              ? "linear-gradient(135deg, rgba(0,255,136,0.25) 0%, rgba(0,180,255,0.2) 100%)"
              : "linear-gradient(135deg, rgba(0,255,136,0.15) 0%, rgba(0,180,255,0.1) 100%)",
            border: "1px solid rgba(0,255,136,0.4)",
            color: "var(--neon-green)",
            fontSize: "13px",
            fontWeight: 600,
            letterSpacing: "0.05em",
            cursor: "pointer",
            transition: "all 0.2s ease",
            textTransform: "uppercase",
            boxShadow: hovered ? "0 0 20px rgba(0,255,136,0.3)" : "none",
          }}
        >
          Connect Wallet
        </button>
      </div>
    </header>
  );
}
