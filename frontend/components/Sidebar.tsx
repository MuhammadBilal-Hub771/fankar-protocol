"use client";

import { useState } from "react";

const NAV_ITEMS = [
  {
    label: "Kit Design",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    badge: "NEW",
  },
  {
    label: "Gully2PSL",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    badge: null,
  },
  {
    label: "Viral Memes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    badge: "HOT",
  },
  {
    label: "Influencers",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    badge: null,
  },
  {
    label: "Creators Hub",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    badge: null,
  },
];

export default function Sidebar() {
  const [active, setActive] = useState("Kit Design");

  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "var(--sidebar-width)",
        height: "100vh",
        background:
          "linear-gradient(180deg, rgba(10,22,40,0.98) 0%, rgba(5,11,20,0.98) 100%)",
        borderRight: "1px solid rgba(0,255,136,0.12)",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
        animation: "slideInLeft 0.4s ease forwards",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Logo area */}
      <div
        style={{
          padding: "28px 24px 24px",
          borderBottom: "1px solid rgba(0,255,136,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Logo mark */}
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background:
                "linear-gradient(135deg, rgba(0,255,136,0.2) 0%, rgba(0,180,255,0.15) 100%)",
              border: "1px solid rgba(0,255,136,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                "0 0 16px rgba(0,255,136,0.2), inset 0 0 10px rgba(0,255,136,0.05)",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <polygon
                points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"
                stroke="#00ff88"
                strokeWidth="1.5"
                fill="rgba(0,255,136,0.1)"
              />
              <circle cx="12" cy="12" r="3" fill="#00ff88" opacity="0.8" />
            </svg>
          </div>

          <div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#e2f0ff",
                textTransform: "uppercase",
                lineHeight: 1.2,
              }}
            >
              Fankar
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "var(--neon-green)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                textShadow: "0 0 8px rgba(0,255,136,0.5)",
              }}
            >
              Protocol
            </div>
          </div>
        </div>

        {/* Protocol version tag */}
        <div
          style={{
            marginTop: "16px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(0,255,136,0.06)",
            border: "1px solid rgba(0,255,136,0.15)",
            borderRadius: "6px",
            padding: "4px 10px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--neon-green)",
              boxShadow: "0 0 6px var(--neon-green)",
              display: "inline-block",
              flexShrink: 0,
              animation: "pulseGreen 2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            v2.4.1 — Alpha
          </span>
        </div>
      </div>

      {/* Section label */}
      <div
        style={{
          padding: "20px 24px 8px",
          fontSize: "10px",
          color: "var(--text-muted)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        Navigation
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: "0 12px", overflowY: "auto" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.label;
          return (
            <button
              key={item.label}
              onClick={() => setActive(item.label)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "11px 14px",
                borderRadius: "10px",
                border: isActive
                  ? "1px solid rgba(0,255,136,0.3)"
                  : "1px solid transparent",
                background: isActive
                  ? "linear-gradient(135deg, rgba(0,255,136,0.12) 0%, rgba(0,180,255,0.06) 100%)"
                  : "transparent",
                color: isActive ? "var(--neon-green)" : "var(--text-muted)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "13.5px",
                fontWeight: isActive ? 600 : 400,
                letterSpacing: "0.02em",
                marginBottom: "4px",
                transition: "all 0.18s ease",
                position: "relative",
                boxShadow: isActive
                  ? "0 0 14px rgba(0,255,136,0.1), inset 0 0 8px rgba(0,255,136,0.04)"
                  : "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(0,255,136,0.04)";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#a8c8e8";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(0,255,136,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--text-muted)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "transparent";
                }
              }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "20%",
                    height: "60%",
                    width: "3px",
                    borderRadius: "0 3px 3px 0",
                    background: "var(--neon-green)",
                    boxShadow: "0 0 8px var(--neon-green)",
                  }}
                />
              )}

              <span
                style={{
                  opacity: isActive ? 1 : 0.6,
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>

              <span style={{ flex: 1 }}>{item.label}</span>

              {item.badge && (
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    background:
                      item.badge === "HOT"
                        ? "rgba(255,60,60,0.15)"
                        : "rgba(0,255,136,0.12)",
                    border:
                      item.badge === "HOT"
                        ? "1px solid rgba(255,60,60,0.4)"
                        : "1px solid rgba(0,255,136,0.35)",
                    color: item.badge === "HOT" ? "#ff6060" : "var(--neon-green)",
                    textTransform: "uppercase",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: wallet snippet */}
      <div
        style={{
          padding: "16px 16px 24px",
          borderTop: "1px solid rgba(0,255,136,0.08)",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(0,255,136,0.06) 0%, rgba(0,180,255,0.04) 100%)",
            border: "1px solid rgba(0,255,136,0.14)",
            borderRadius: "10px",
            padding: "14px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Wallet
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, #00ff88 0%, #00b4ff 100%)",
                opacity: 0.7,
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#a8c8e8",
                  fontFamily: "monospace",
                  letterSpacing: "0.04em",
                }}
              >
                0x3f...a9b2
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--neon-green)",
                  fontWeight: 600,
                }}
              >
                12.44 ETH
              </div>
            </div>
          </div>
        </div>

        {/* Version footer */}
        <div
          style={{
            marginTop: "14px",
            textAlign: "center",
            fontSize: "10px",
            color: "rgba(107,140,174,0.5)",
            letterSpacing: "0.06em",
          }}
        >
          © 2026 Fankar Protocol
        </div>
      </div>
    </aside>
  );
}
