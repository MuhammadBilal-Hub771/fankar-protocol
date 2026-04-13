"use client";

const STATS = [
  {
    label: "Total Creators",
    value: "14,820",
    change: "+12.4%",
    positive: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    accent: "#00ff88",
  },
  {
    label: "NFTs Minted",
    value: "89,412",
    change: "+7.1%",
    positive: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    accent: "#00b4ff",
  },
  {
    label: "Protocol Revenue",
    value: "$2.38M",
    change: "+31.6%",
    positive: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    accent: "#a855f7",
  },
  {
    label: "Active Campaigns",
    value: "1,043",
    change: "-2.3%",
    positive: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
    accent: "#fbbf24",
  },
];

const TRENDING = [
  { rank: 1, name: "ZainFC", category: "Kit Design", volume: "420 ETH", badge: "🔥" },
  { rank: 2, name: "NeonMirza", category: "Viral Memes", volume: "318 ETH", badge: "⚡" },
  { rank: 3, name: "GullyAce", category: "Gully2PSL", volume: "255 ETH", badge: "🏆" },
  { rank: 4, name: "PixelKhan", category: "Creators Hub", volume: "190 ETH", badge: "🎨" },
  { rank: 5, name: "UrbanVault", category: "Influencers", volume: "144 ETH", badge: "💎" },
];

const ACTIVITY = [
  { action: "NFT Minted", user: "0x4a...f12c", amount: "2.4 ETH", time: "2m ago", status: "success" },
  { action: "Kit Deployed", user: "0x9e...3bc1", amount: "0.8 ETH", time: "11m ago", status: "success" },
  { action: "Collab Started", user: "0x1d...77a4", amount: "1.2 ETH", time: "24m ago", status: "pending" },
  { action: "Meme Airdrop", user: "0xf3...c09d", amount: "5.0 ETH", time: "38m ago", status: "success" },
  { action: "Stake Locked", user: "0x6b...e84f", amount: "10 ETH", time: "1h ago", status: "success" },
];

function StatCard({
  label,
  value,
  change,
  positive,
  icon,
  accent,
}: (typeof STATS)[0]) {
  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(13,31,53,0.9) 0%, rgba(10,22,40,0.9) 100%)",
        border: `1px solid ${accent}22`,
        borderRadius: "14px",
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "default",
        animation: "fadeInUp 0.5s ease forwards",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 30px ${accent}18`;
        (e.currentTarget as HTMLDivElement).style.borderColor = `${accent}40`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.borderColor = `${accent}22`;
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "-30px",
          right: "-30px",
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}12 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: `${accent}14`,
            border: `1px solid ${accent}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: accent,
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: positive ? "#34d399" : "#f87171",
            background: positive ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
            border: `1px solid ${positive ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}`,
            borderRadius: "6px",
            padding: "3px 8px",
          }}
        >
          {positive ? "▲" : "▼"} {change}
        </span>
      </div>

      <div
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "#e2f0ff",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          marginBottom: "6px",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "13px",
          color: "var(--text-muted)",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: "1200px" }}>
      {/* Page header */}
      <div style={{ marginBottom: "32px", animation: "fadeInUp 0.4s ease forwards" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <span
            style={{
              fontSize: "11px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--neon-green)",
              textShadow: "0 0 10px rgba(0,255,136,0.5)",
            }}
          >
            ◆ Dashboard Overview
          </span>
        </div>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 800,
            color: "#e2f0ff",
            letterSpacing: "-0.03em",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Welcome to{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #00ff88 0%, #00b4ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Fankar Protocol
          </span>
        </h1>
        <p
          style={{
            marginTop: "8px",
            fontSize: "14px",
            color: "var(--text-muted)",
            maxWidth: "520px",
            lineHeight: 1.6,
          }}
        >
          The decentralized creator economy powering culture, kits & communities
          on-chain.
        </p>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Lower grid: trending + activity */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.3fr",
          gap: "20px",
        }}
      >
        {/* Trending creators */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(13,31,53,0.9) 0%, rgba(10,22,40,0.9) 100%)",
            border: "1px solid rgba(0,255,136,0.1)",
            borderRadius: "14px",
            overflow: "hidden",
            animation: "fadeInUp 0.6s ease forwards",
          }}
        >
          <div
            style={{
              padding: "20px 24px 14px",
              borderBottom: "1px solid rgba(0,255,136,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#c8dff0",
                letterSpacing: "0.02em",
              }}
            >
              Trending Creators
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "var(--neon-green)",
                letterSpacing: "0.08em",
                cursor: "pointer",
                opacity: 0.8,
              }}
            >
              View All →
            </span>
          </div>
          <div style={{ padding: "8px 0" }}>
            {TRENDING.map((creator, idx) => (
              <div
                key={creator.rank}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "12px 24px",
                  borderBottom:
                    idx < TRENDING.length - 1
                      ? "1px solid rgba(255,255,255,0.03)"
                      : "none",
                  transition: "background 0.15s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "rgba(0,255,136,0.03)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "transparent";
                }}
              >
                <span
                  style={{
                    width: "20px",
                    fontSize: "12px",
                    color: idx === 0 ? "#fbbf24" : "var(--text-muted)",
                    fontWeight: idx === 0 ? 700 : 400,
                    flexShrink: 0,
                    textAlign: "center",
                  }}
                >
                  {creator.rank}
                </span>
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, hsl(${idx * 60 + 150}, 70%, 50%) 0%, hsl(${idx * 60 + 200}, 80%, 40%) 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                >
                  {creator.badge}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: 600,
                      color: "#c8dff0",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {creator.name}
                  </div>
                  <div
                    style={{ fontSize: "11px", color: "var(--text-muted)" }}
                  >
                    {creator.category}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--neon-green)",
                    flexShrink: 0,
                  }}
                >
                  {creator.volume}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(13,31,53,0.9) 0%, rgba(10,22,40,0.9) 100%)",
            border: "1px solid rgba(0,255,136,0.1)",
            borderRadius: "14px",
            overflow: "hidden",
            animation: "fadeInUp 0.7s ease forwards",
          }}
        >
          <div
            style={{
              padding: "20px 24px 14px",
              borderBottom: "1px solid rgba(0,255,136,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#c8dff0",
                letterSpacing: "0.02em",
              }}
            >
              Live Activity Feed
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
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
                  animation: "pulseGreen 1.5s ease-in-out infinite",
                }}
              />
              <span style={{ fontSize: "11px", color: "var(--neon-green)" }}>
                Live
              </span>
            </div>
          </div>
          <div style={{ padding: "8px 0" }}>
            {ACTIVITY.map((tx, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "13px 24px",
                  borderBottom:
                    idx < ACTIVITY.length - 1
                      ? "1px solid rgba(255,255,255,0.03)"
                      : "none",
                  transition: "background 0.15s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "rgba(0,255,136,0.03)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "transparent";
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background:
                      tx.status === "success" ? "#00ff88" : "#fbbf24",
                    boxShadow: `0 0 6px ${tx.status === "success" ? "#00ff88" : "#fbbf24"}`,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#c8dff0",
                    }}
                  >
                    {tx.action}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      fontFamily: "monospace",
                    }}
                  >
                    {tx.user}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--neon-green)",
                    }}
                  >
                    {tx.amount}
                  </div>
                  <div
                    style={{ fontSize: "11px", color: "var(--text-muted)" }}
                  >
                    {tx.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Protocol banner */}
      <div
        style={{
          marginTop: "24px",
          borderRadius: "14px",
          padding: "24px 32px",
          background:
            "linear-gradient(135deg, rgba(0,255,136,0.08) 0%, rgba(0,180,255,0.06) 50%, rgba(168,85,247,0.06) 100%)",
          border: "1px solid rgba(0,255,136,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
          flexWrap: "wrap",
          animation: "fadeInUp 0.8s ease forwards",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#e2f0ff",
              marginBottom: "6px",
            }}
          >
            🚀 Gully2PSL Season 3 is{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #00ff88 0%, #00b4ff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Live Now
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: "var(--text-muted)",
              maxWidth: "460px",
            }}
          >
            Mint your kit, back your team, and earn protocol rewards. The
            biggest cricket Web3 event in Pakistan is on-chain.
          </p>
        </div>
        <button
          style={{
            padding: "12px 28px",
            borderRadius: "10px",
            background:
              "linear-gradient(135deg, rgba(0,255,136,0.2) 0%, rgba(0,180,255,0.15) 100%)",
            border: "1px solid rgba(0,255,136,0.45)",
            color: "var(--neon-green)",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            cursor: "pointer",
            whiteSpace: "nowrap",
            textTransform: "uppercase",
            boxShadow: "0 0 20px rgba(0,255,136,0.15)",
            transition: "all 0.2s ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 30px rgba(0,255,136,0.35)";
            (e.currentTarget as HTMLButtonElement).style.background =
              "linear-gradient(135deg, rgba(0,255,136,0.3) 0%, rgba(0,180,255,0.25) 100%)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 20px rgba(0,255,136,0.15)";
            (e.currentTarget as HTMLButtonElement).style.background =
              "linear-gradient(135deg, rgba(0,255,136,0.2) 0%, rgba(0,180,255,0.15) 100%)";
          }}
        >
          Mint Your Kit →
        </button>
      </div>
    </div>
  );
}
