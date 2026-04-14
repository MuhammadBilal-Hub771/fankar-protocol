"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FankarMintStudio from "@/components/FankarMintStudio";
import BuyersMarketplace from "@/components/BuyersMarketplace";

// ── Valid creator-studio tab IDs ──────────────────────────────
type TabId = "kit_design" | "gully2psl" | "viral_memes" | "influencers" | "creators_hub";
const CREATOR_TABS: TabId[] = ["kit_design", "gully2psl", "viral_memes", "influencers", "creators_hub"];

// ── Tab-specific header copy ──────────────────────────────────
const TAB_COPY: Record<TabId, { headline: string; sub: string }> = {
  kit_design:   { headline: "Mint Your Kit Design",   sub: "Upload your kit artwork, set a price — AI will score uniqueness and mint it on WireFluid."  },
  gully2psl:    { headline: "Mint a Gully2PSL Card",  sub: "Showcase raw street talent. AI analyses bowling speed and uniqueness before minting."         },
  viral_memes:  { headline: "Mint a Viral Meme",      sub: "Tokenise the internet's best moments. AI validates originality and stores it on-chain forever." },
  influencers:  { headline: "Mint an Influencer NFT", sub: "Create limited-edition fan drops. AI gates minting so only verified content goes on-chain."    },
  creators_hub: { headline: "Mint Your Artwork",      sub: "Publish digital art, photography, and original works secured by the Fankar AI Gatekeeper."     },
};

// ── Inner page (requires useSearchParams — wrapped in Suspense below) ──
function PageContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "kit_design";

  const isMarketplace  = view === "marketplace";
  const isCreatorTab   = CREATOR_TABS.includes(view as TabId);
  const activeCreator  = isCreatorTab ? (view as TabId) : "kit_design";
  const copy           = TAB_COPY[activeCreator];

  /* ─── Buyers Marketplace ─────────────────────────────────── */
  if (isMarketplace) {
    return (
      <div style={{ minHeight: "100%", paddingTop: "8px", paddingBottom: "48px", animation: "fadeInUp 0.4s ease forwards" }}>
        <BuyersMarketplace />
      </div>
    );
  }

  /* ─── Creator Studio (any of the 5 tabs) ───────────────────── */
  return (
    <div style={{
      minHeight: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: "8px",
      paddingBottom: "48px",
    }}>

      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ width: "100%", maxWidth: "720px", marginBottom: "32px", animation: "fadeInUp 0.4s ease forwards" }}>

        {/* Protocol badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)",
          borderRadius: "20px", padding: "5px 14px", marginBottom: "18px",
        }}>
          <span style={{
            width: "7px", height: "7px", borderRadius: "50%",
            background: "var(--neon-green)", boxShadow: "0 0 8px var(--neon-green)",
            display: "inline-block", animation: "pulseGreen 2s ease-in-out infinite",
          }} />
          <span style={{ fontSize: "11px", color: "var(--neon-green)", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
            Creator Studio · WireFluid Chain 92533
          </span>
        </div>

        {/* Headline — changes with tab */}
        <h1 style={{ fontSize: "36px", fontWeight: 800, color: "#e2f0ff", letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 10px" }}>
          {copy.headline.split(" ").slice(0, 2).join(" ")}{" "}
          <span style={{
            background: "linear-gradient(90deg, #00ff88 0%, #00b4ff 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            {copy.headline.split(" ").slice(2).join(" ")}
          </span>
        </h1>

        <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 20px", maxWidth: "520px" }}>
          {copy.sub}
        </p>

        {/* Step pills */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {[
            { n: "1", label: "AI Analysis",       color: "#00ff88" },
            { n: "2", label: "Upload to IPFS",    color: "#00b4ff" },
            { n: "3", label: "Mint on WireFluid", color: "#a855f7" },
          ].map(step => (
            <div key={step.n} style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "6px 14px", borderRadius: "8px",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <span style={{
                width: "20px", height: "20px", borderRadius: "50%",
                background: `${step.color}18`, border: `1px solid ${step.color}50`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px", fontWeight: 700, color: step.color, flexShrink: 0,
              }}>
                {step.n}
              </span>
              <span style={{ fontSize: "12px", color: "#a8c8e8" }}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mint Studio ──────────────────────────────────────── */}
      <div style={{ width: "100%", maxWidth: "720px", animation: "fadeInUp 0.5s ease forwards" }}>
        <FankarMintStudio initialTab={activeCreator} />
      </div>

      {/* ── Contract info strip ──────────────────────────────── */}
      <div style={{
        width: "100%", maxWidth: "720px", marginTop: "24px",
        padding: "14px 20px", borderRadius: "12px",
        background: "rgba(13,31,53,0.6)", border: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "10px",
        animation: "fadeInUp 0.6s ease forwards",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Contract</span>
          <code style={{
            fontSize: "11px", color: "#a8c8e8", fontFamily: "monospace",
            background: "rgba(0,0,0,0.3)", padding: "3px 8px",
            borderRadius: "5px", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
              ? `${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS.slice(0, 8)}…${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS.slice(-6)}`
              : "Not configured"}
          </code>
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          {[{ label: "Network", value: "WireFluid" }, { label: "Chain ID", value: "92533" }, { label: "Token", value: "WIRE" }].map(item => (
            <div key={item.label} style={{ textAlign: "right" }}>
              <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{item.label}</div>
              <div style={{ fontSize: "12px", color: "var(--neon-green)", fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Public default export — Suspense boundary required for useSearchParams ──
export default function HomePage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", letterSpacing: "0.1em" }}>Loading...</div>
      </div>
    }>
      <PageContent />
    </Suspense>
  );
}
