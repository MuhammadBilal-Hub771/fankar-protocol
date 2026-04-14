"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

// ── Nav item definitions ─────────────────────────────────────

const EXPLORE_ITEMS = [
  {
    id: "marketplace",
    label: "Buyers Marketplace",
    badge: "LIVE",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
    isMarketplace: true,
  },
];

const CREATOR_ITEMS = [
  {
    id: "kit_design",
    label: "Kit Design",
    badge: "NEW",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    isMarketplace: false,
  },
  {
    id: "gully2psl",
    label: "Gully2PSL",
    badge: null,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    isMarketplace: false,
  },
  {
    id: "viral_memes",
    label: "Viral Memes",
    badge: "HOT",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    isMarketplace: false,
  },
  {
    id: "influencers",
    label: "Influencers",
    badge: null,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    isMarketplace: false,
  },
  {
    id: "creators_hub",
    label: "Creators Hub",
    badge: null,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    isMarketplace: false,
  },
];

// ── Section header ───────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      padding: "16px 16px 6px",
      fontSize: "9.5px",
      color: "rgba(107,140,174,0.5)",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      fontWeight: 600,
    }}>
      {label}
    </div>
  );
}

// ── Nav button ───────────────────────────────────────────────
interface NavButtonProps {
  item: typeof EXPLORE_ITEMS[0] | typeof CREATOR_ITEMS[0];
  isActive: boolean;
  onClick: () => void;
}

function NavButton({ item, isActive, onClick }: NavButtonProps) {
  const isMarket = item.isMarketplace;

  const activeColor   = isMarket ? "#facc15" : "var(--neon-green)";
  const activeBg      = isMarket
    ? "linear-gradient(135deg, rgba(250,204,21,0.14) 0%, rgba(251,146,60,0.08) 100%)"
    : "linear-gradient(135deg, rgba(0,255,136,0.12) 0%, rgba(0,180,255,0.06) 100%)";
  const activeBorder  = isMarket
    ? "1px solid rgba(250,204,21,0.35)"
    : "1px solid rgba(0,255,136,0.30)";
  const activeGlow    = isMarket
    ? "0 0 16px rgba(250,204,21,0.15)"
    : "0 0 14px rgba(0,255,136,0.10)";
  const barColor      = isMarket ? "#facc15" : "var(--neon-green)";

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: isMarket ? "12px 14px" : "10px 14px",
        borderRadius: "10px",
        border: isActive ? activeBorder : "1px solid transparent",
        background: isActive ? activeBg : "transparent",
        color: isActive ? activeColor : "var(--text-muted)",
        cursor: "pointer",
        textAlign: "left",
        fontSize: isMarket ? "13.5px" : "13px",
        fontWeight: isActive ? 600 : 400,
        letterSpacing: "0.02em",
        marginBottom: "3px",
        transition: "all 0.18s ease",
        position: "relative",
        boxShadow: isActive ? activeGlow : "none",
      }}
      onMouseEnter={e => {
        if (!isActive) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = isMarket ? "rgba(250,204,21,0.06)" : "rgba(0,255,136,0.04)";
          el.style.color = isMarket ? "#facc15" : "#a8c8e8";
          el.style.borderColor = isMarket ? "rgba(250,204,21,0.15)" : "rgba(0,255,136,0.10)";
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = "transparent";
          el.style.color = "var(--text-muted)";
          el.style.borderColor = "transparent";
        }
      }}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span style={{
          position: "absolute", left: 0, top: "20%", height: "60%",
          width: "3px", borderRadius: "0 3px 3px 0",
          background: barColor, boxShadow: `0 0 8px ${barColor}`,
        }} />
      )}

      {/* Icon */}
      <span style={{ opacity: isActive ? 1 : 0.55, display: "flex", alignItems: "center", flexShrink: 0 }}>
        {item.icon}
      </span>

      <span style={{ flex: 1 }}>{item.label}</span>

      {/* Badge */}
      {item.badge && (
        <span style={{
          fontSize: "9px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          padding: "2px 7px",
          borderRadius: "4px",
          background:
            item.badge === "HOT"  ? "rgba(255,60,60,0.15)"  :
            item.badge === "LIVE" ? "rgba(250,204,21,0.15)" :
                                    "rgba(0,255,136,0.12)",
          border:
            item.badge === "HOT"  ? "1px solid rgba(255,60,60,0.40)"  :
            item.badge === "LIVE" ? "1px solid rgba(250,204,21,0.45)" :
                                    "1px solid rgba(0,255,136,0.35)",
          color:
            item.badge === "HOT"  ? "#ff6060"  :
            item.badge === "LIVE" ? "#facc15"  :
                                    "var(--neon-green)",
          textTransform: "uppercase",
          animation: item.badge === "LIVE" ? "pulseGreen 2s ease-in-out infinite" : "none",
        }}>
          {item.badge}
        </span>
      )}
    </button>
  );
}

// ── Inner sidebar (needs useSearchParams) ────────────────────
function SidebarInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const activeView   = searchParams.get("view") ?? "kit_design";

  const navigate = (id: string) => router.push(`/?view=${id}`);

  return (
    <aside style={{
      position: "fixed",
      top: 0, left: 0,
      width: "var(--sidebar-width)",
      height: "100vh",
      background: "linear-gradient(180deg, rgba(10,22,40,0.98) 0%, rgba(5,11,20,0.98) 100%)",
      borderRight: "1px solid rgba(0,255,136,0.12)",
      display: "flex",
      flexDirection: "column",
      zIndex: 50,
      animation: "slideInLeft 0.4s ease forwards",
      backdropFilter: "blur(20px)",
    }}>

      {/* ── Logo ── */}
      <div style={{ padding: "28px 24px 24px", borderBottom: "1px solid rgba(0,255,136,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "10px",
            background: "linear-gradient(135deg, rgba(0,255,136,0.2) 0%, rgba(0,180,255,0.15) 100%)",
            border: "1px solid rgba(0,255,136,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 16px rgba(0,255,136,0.2), inset 0 0 10px rgba(0,255,136,0.05)",
            flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" stroke="#00ff88" strokeWidth="1.5" fill="rgba(0,255,136,0.1)" />
              <circle cx="12" cy="12" r="3" fill="#00ff88" opacity="0.8" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "0.08em", color: "#e2f0ff", textTransform: "uppercase", lineHeight: 1.2 }}>
              Fankar
            </div>
            <div style={{ fontSize: "10px", color: "var(--neon-green)", letterSpacing: "0.15em", textTransform: "uppercase", textShadow: "0 0 8px rgba(0,255,136,0.5)" }}>
              Protocol
            </div>
          </div>
        </div>

        <div style={{
          marginTop: "16px",
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.15)",
          borderRadius: "6px", padding: "4px 10px",
        }}>
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: "var(--neon-green)", boxShadow: "0 0 6px var(--neon-green)",
            display: "inline-block", flexShrink: 0,
            animation: "pulseGreen 2s ease-in-out infinite",
          }} />
          <span style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            v2.4.1 — Alpha
          </span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: "4px 12px", overflowY: "auto" }}>

        {/* EXPLORE section */}
        <SectionHeader label="Explore" />
        {EXPLORE_ITEMS.map(item => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activeView === item.id}
            onClick={() => navigate(item.id)}
          />
        ))}

        {/* Divider */}
        <div style={{ margin: "10px 4px", height: "1px", background: "rgba(255,255,255,0.05)" }} />

        {/* CREATOR STUDIO section */}
        <SectionHeader label="Creator Studio" />
        {CREATOR_ITEMS.map(item => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activeView === item.id}
            onClick={() => navigate(item.id)}
          />
        ))}
      </nav>

      {/* ── Wallet snippet ── */}
      <div style={{ padding: "16px 16px 24px", borderTop: "1px solid rgba(0,255,136,0.08)" }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(0,255,136,0.06) 0%, rgba(0,180,255,0.04) 100%)",
          border: "1px solid rgba(0,255,136,0.14)",
          borderRadius: "10px", padding: "14px",
        }}>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
            Wallet
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              background: "linear-gradient(135deg, #00ff88 0%, #00b4ff 100%)",
              opacity: 0.7, flexShrink: 0,
            }} />
            <div>
              <div style={{ fontSize: "12px", color: "#a8c8e8", fontFamily: "monospace", letterSpacing: "0.04em" }}>
                0x3f...a9b2
              </div>
              <div style={{ fontSize: "11px", color: "var(--neon-green)", fontWeight: 600 }}>
                12.44 WIRE
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "14px", textAlign: "center", fontSize: "10px", color: "rgba(107,140,174,0.4)", letterSpacing: "0.06em" }}>
          © 2026 Fankar Protocol
        </div>
      </div>
    </aside>
  );
}

// ── Public export wrapped in Suspense ────────────────────────
export default function Sidebar() {
  return (
    <Suspense fallback={
      <aside style={{
        position: "fixed", top: 0, left: 0,
        width: "var(--sidebar-width)", height: "100vh",
        background: "rgba(10,22,40,0.98)",
        borderRight: "1px solid rgba(0,255,136,0.12)",
        zIndex: 50,
      }} />
    }>
      <SidebarInner />
    </Suspense>
  );
}
