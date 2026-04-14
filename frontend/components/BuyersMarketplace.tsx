"use client";

/**
 * BuyersMarketplace.tsx
 * ──────────────────────
 * Hybrid marketplace: real on-chain NFTs fetched from WireFluid + mock fill.
 * Real NFTs appear first, mock NFTs fill the rest.
 */

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import FankarNFTAbi from "./FankarNFT.json";
import AssetDetailsModal from "./AssetDetailsModal";

// ── Blockchain constants ──────────────────────────────────────
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const RPC_URL          = "https://evm.wirefluid.com";
const IPFS_GATEWAY     = "https://gateway.pinata.cloud/ipfs/";

function ipfsToHttp(uri: string): string {
  if (uri.startsWith("ipfs://")) return IPFS_GATEWAY + uri.slice(7);
  return uri;
}

// ── Feature-type → display config ────────────────────────────
const FEATURE_MAP: Record<string, { label: string; color: string; emoji: string; gradient: string }> = {
  kit_design:   { label: "Kit Design",   color: "#00ff88", emoji: "🎽", gradient: "linear-gradient(135deg,#00ff88 0%,#00b4ff 100%)" },
  gully2psl:    { label: "Gully2PSL",    color: "#facc15", emoji: "🏏", gradient: "linear-gradient(135deg,#facc15 0%,#f97316 100%)" },
  viral_memes:  { label: "Viral Memes",  color: "#f97316", emoji: "🔥", gradient: "linear-gradient(135deg,#f97316 0%,#ef4444 100%)" },
  influencers:  { label: "Influencers",  color: "#a855f7", emoji: "⭐", gradient: "linear-gradient(135deg,#a855f7 0%,#ec4899 100%)" },
  creators_hub: { label: "Creators Hub", color: "#00b4ff", emoji: "🎨", gradient: "linear-gradient(135deg,#00b4ff 0%,#6366f1 100%)" },
};

// ── Unified NFT type (exported so AssetDetailsModal can import it) ──
export interface DisplayNFT {
  id:            string;
  title:         string;
  category:      string;
  categoryColor: string;
  price:         string;
  gradient:      string;
  emoji:         string;
  isReal:        boolean;
  imageUrl?:     string;
  tokenId?:      number;
  uniquenessScore?: number;
}

// ── Mock NFTs (fill when blockchain is sparse) ────────────────
const MOCK_NFTS: DisplayNFT[] = [
  { id: "m1",  title: "Lahore Qalandars Home Kit",      category: "Kit Design",   categoryColor: "#00ff88", price: "12.5",  gradient: "linear-gradient(135deg,#00ff88 0%,#00b4ff 100%)", emoji: "🎽", isReal: false },
  { id: "m2",  title: "Naseem Shah — 152 km/h",         category: "Gully2PSL",    categoryColor: "#facc15", price: "45.0",  gradient: "linear-gradient(135deg,#facc15 0%,#f97316 100%)", emoji: "🏏", isReal: false },
  { id: "m3",  title: "The Sixer That Broke Twitter",   category: "Viral Memes",  categoryColor: "#f97316", price: "8.2",   gradient: "linear-gradient(135deg,#f97316 0%,#ef4444 100%)", emoji: "🔥", isReal: false },
  { id: "m4",  title: "Shahid Afridi — Genesis",        category: "Influencers",  categoryColor: "#a855f7", price: "99.0",  gradient: "linear-gradient(135deg,#a855f7 0%,#ec4899 100%)", emoji: "⭐", isReal: false },
  { id: "m5",  title: "Green Fields at Dusk",           category: "Creators Hub", categoryColor: "#00b4ff", price: "22.0",  gradient: "linear-gradient(135deg,#00b4ff 0%,#6366f1 100%)", emoji: "🎨", isReal: false },
  { id: "m6",  title: "Karachi Kings Away Kit",         category: "Kit Design",   categoryColor: "#00ff88", price: "10.0",  gradient: "linear-gradient(135deg,#10b981 0%,#06b6d4 100%)", emoji: "🎽", isReal: false },
  { id: "m7",  title: "PSL Finals Meme Pack",           category: "Viral Memes",  categoryColor: "#f97316", price: "5.5",   gradient: "linear-gradient(135deg,#fb923c 0%,#f59e0b 100%)", emoji: "🔥", isReal: false },
  { id: "m8",  title: "Mohammad Amir — Comeback",       category: "Gully2PSL",    categoryColor: "#facc15", price: "35.0",  gradient: "linear-gradient(135deg,#eab308 0%,#84cc16 100%)", emoji: "🏏", isReal: false },
  { id: "m9",  title: "Neon Karachi — Digital",         category: "Creators Hub", categoryColor: "#00b4ff", price: "18.5",  gradient: "linear-gradient(135deg,#38bdf8 0%,#818cf8 100%)", emoji: "🎨", isReal: false },
  { id: "m10", title: "@CricketMania Official",         category: "Influencers",  categoryColor: "#a855f7", price: "55.0",  gradient: "linear-gradient(135deg,#c084fc 0%,#f472b6 100%)", emoji: "⭐", isReal: false },
  { id: "m11", title: "Peshawar Zalmi — Heritage",      category: "Kit Design",   categoryColor: "#00ff88", price: "14.0",  gradient: "linear-gradient(135deg,#4ade80 0%,#22d3ee 100%)", emoji: "🎽", isReal: false },
  { id: "m12", title: "Javed Miandad's Last Ball",      category: "Viral Memes",  categoryColor: "#f97316", price: "120.0", gradient: "linear-gradient(135deg,#f43f5e 0%,#f97316 100%)", emoji: "🔥", isReal: false },
];

// ── Explainer cards ───────────────────────────────────────────
const ASSET_TYPES = [
  { icon: "🎽", color: "#00ff88", title: "Kit Designs",   desc: "Own iconic cricket & sports kits. Every jersey is a unique piece of culture, verified by AI." },
  { icon: "🏏", color: "#facc15", title: "Gully2PSL",     desc: "Invest in raw talent. Collect player cards that track real bowling speed and uniqueness on-chain." },
  { icon: "🔥", color: "#f97316", title: "Viral Memes",   desc: "The internet's most legendary moments, tokenised. Own the meme before it blows up." },
  { icon: "⭐", color: "#a855f7", title: "Influencers",   desc: "Back your favourite creators early. Limited edition influencer NFTs with royalty perks." },
  { icon: "🎨", color: "#00b4ff", title: "Creators Hub",  desc: "Fine digital art, photography & original works — directly from South Asia's top creators." },
];

const FILTERS = ["All", "Kit Design", "Gully2PSL", "Viral Memes", "Influencers", "Creators Hub"];

// ── Toast component ───────────────────────────────────────────
interface ToastState { message: string; visible: boolean; type: "success" | "error" }

function Toast({ toast }: { toast: ToastState }) {
  return (
    <div style={{
      position: "fixed",
      bottom: "32px",
      right: "32px",
      zIndex: 1000,
      padding: "14px 20px",
      borderRadius: "12px",
      background: toast.type === "success"
        ? "linear-gradient(135deg, rgba(0,255,136,0.18) 0%, rgba(0,180,255,0.12) 100%)"
        : "linear-gradient(135deg, rgba(255,80,80,0.18) 0%, rgba(200,0,0,0.12) 100%)",
      border: toast.type === "success"
        ? "1px solid rgba(0,255,136,0.45)"
        : "1px solid rgba(255,80,80,0.45)",
      boxShadow: toast.type === "success"
        ? "0 8px 32px rgba(0,255,136,0.18)"
        : "0 8px 32px rgba(255,80,80,0.18)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      opacity: toast.visible ? 1 : 0,
      transform: toast.visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
      pointerEvents: toast.visible ? "auto" : "none",
      minWidth: "280px",
      maxWidth: "380px",
    }}>
      <div style={{
        width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
        background: toast.type === "success" ? "rgba(0,255,136,0.15)" : "rgba(255,80,80,0.15)",
        border: toast.type === "success" ? "1px solid rgba(0,255,136,0.4)" : "1px solid rgba(255,80,80,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px",
      }}>
        {toast.type === "success" ? "✓" : "✕"}
      </div>
      <div>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2f0ff", marginBottom: "2px" }}>
          {toast.type === "success" ? "Purchase Initiated" : "Action Failed"}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.5 }}>
          {toast.message}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function BuyersMarketplace() {
  const [displayNFTs,  setDisplayNFTs]  = useState<DisplayNFT[]>(MOCK_NFTS);
  const [realCount,    setRealCount]    = useState(0);
  const [fetchStatus,  setFetchStatus]  = useState<"loading" | "done" | "error">("loading");
  const [activeFilter, setActiveFilter] = useState("All");
  const [hoveredCard,  setHoveredCard]  = useState<string | null>(null);
  const [toast,        setToast]        = useState<ToastState>({ message: "", visible: false, type: "success" });
  const [imgErrors,    setImgErrors]    = useState<Record<string, boolean>>({});
  const [selectedNFT,  setSelectedNFT]  = useState<DisplayNFT | null>(null);

  // ── Toast helper ──────────────────────────────────────────
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, visible: true, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4500);
  }, []);

  // ── Open modal (used by both card click and BUY NOW button) ──
  const openModal = useCallback((nft: DisplayNFT) => setSelectedNFT(nft), []);

  // ── Modal success callback → show global toast ────────────
  const handlePurchaseSuccess = useCallback((nft: DisplayNFT, _txHash: string) => {
    showToast(`You now own "${nft.title}"!`, "success");
  }, [showToast]);

  // ── Fetch real NFTs via totalMinted() + tokenURI() loop ──────
  // Avoids eth_getLogs entirely — no block-range limit can trip us.
  useEffect(() => {
    if (!CONTRACT_ADDRESS) {
      setFetchStatus("done");
      return;
    }

    async function fetchRealNFTs() {
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, FankarNFTAbi, provider);

        // 1. How many tokens exist?
        const totalBig: bigint = await contract.totalMinted();
        const total = Number(totalBig);

        if (total === 0) {
          setFetchStatus("done");
          return;
        }

        // 2. Build token ID list (newest first, cap at 20 for speed)
        const cap = Math.min(total, 20);
        const tokenIds: number[] = [];
        for (let i = total; i > total - cap; i--) tokenIds.push(i);

        // 3. Resolve tokenURI + metadata for each ID in parallel
        const settled = await Promise.allSettled(
          tokenIds.map(async (tokenId) => {
            // a) Get on-chain URI (no block-range query)
            const rawUri: string = await contract.tokenURI(tokenId);
            const metaUrl = ipfsToHttp(rawUri);

            // b) Fetch IPFS metadata JSON
            const res = await fetch(metaUrl, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) throw new Error(`metadata fetch failed (${res.status})`);
            const meta = await res.json();

            // c) Detect feature type → display config
            const featureType: string = meta?.fankar?.feature_type ?? "kit_design";
            const fm = FEATURE_MAP[featureType] ?? FEATURE_MAP.kit_design;

            // d) Parse uniqueness score — try multiple locations defensively
            type Attr = { trait_type: string; value: string | number };
            const attrs: Attr[] = Array.isArray(meta?.attributes) ? meta.attributes : [];
            const scoreAttr = attrs.find(a =>
              typeof a.trait_type === "string" &&
              a.trait_type.toLowerCase().includes("uniqueness")
            );

            let uniquenessScore = 0;
            if (scoreAttr !== undefined) {
              const raw = Number(scoreAttr.value);
              if (!isNaN(raw)) {
                // Backend stores it as e.g. "90.00" (percent) in attributes
                // but internally uses integer basis-points (9000 = 90%).
                // If value > 100 it's already in basis-points; otherwise multiply.
                uniquenessScore = raw > 100 ? Math.round(raw) : Math.round(raw * 100);
              }
            } else if (typeof meta?.uniqueness_score === "number") {
              // Flat top-level key fallback
              const raw = meta.uniqueness_score as number;
              uniquenessScore = raw > 100 ? Math.round(raw) : Math.round(raw * 100);
            }
            // uniquenessScore = 0 means "not available" — UI will show "N/A"

            // e) Price — try fankar namespace first, then attributes, then default
            let priceStr = "Not Listed";
            const fankarPrice = meta?.fankar?.listing_price_wire;
            if (typeof fankarPrice === "number" && fankarPrice > 0) {
              priceStr = String(fankarPrice);
            } else if (typeof fankarPrice === "string" && parseFloat(fankarPrice) > 0) {
              priceStr = fankarPrice;
            } else {
              // Check attributes array for a "Listing Price" trait
              const priceAttr = attrs.find(a =>
                typeof a.trait_type === "string" &&
                a.trait_type.toLowerCase().includes("listing price")
              );
              if (priceAttr) {
                // Value is stored as "12.5 WIRE" — strip the unit
                const numeric = parseFloat(String(priceAttr.value));
                if (!isNaN(numeric) && numeric > 0) priceStr = String(numeric);
              }
            }

            // f) Image
            const rawImg: string = meta?.image ?? "";
            const imageUrl = rawImg ? ipfsToHttp(rawImg) : undefined;

            return {
              id:             `real-${tokenId}`,
              title:          meta?.name ?? `Token #${tokenId}`,
              category:       fm.label,
              categoryColor:  fm.color,
              price:          priceStr,
              gradient:       fm.gradient,
              emoji:          fm.emoji,
              isReal:         true,
              imageUrl,
              tokenId,
              uniquenessScore,
            } satisfies DisplayNFT;
          })
        );

        const realNFTs: DisplayNFT[] = settled
          .filter(r => r.status === "fulfilled")
          .map(r => (r as PromiseFulfilledResult<DisplayNFT>).value);

        setRealCount(realNFTs.length);
        // Real NFTs first — mocks fill the rest
        setDisplayNFTs([...realNFTs, ...MOCK_NFTS]);
        setFetchStatus("done");
      } catch (err) {
        console.error("[BuyersMarketplace] fetchRealNFTs error:", err);
        setFetchStatus("error");
      }
    }

    fetchRealNFTs();
  }, []);

  // ── Filtered view ─────────────────────────────────────────
  const filtered = activeFilter === "All"
    ? displayNFTs
    : displayNFTs.filter(n => n.category === activeFilter);

  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "60px" }}>
      <Toast toast={toast} />

      {/* ── HERO BANNER ─────────────────────────────────────── */}
      <div style={{
        position: "relative",
        borderRadius: "18px",
        overflow: "hidden",
        marginBottom: "36px",
        padding: "36px 40px",
        background: "linear-gradient(135deg, rgba(250,204,21,0.10) 0%, rgba(249,115,22,0.08) 50%, rgba(168,85,247,0.08) 100%)",
        border: "1px solid rgba(250,204,21,0.25)",
      }}>
        <div style={{
          position: "absolute", top: "-40px", right: "-40px",
          width: "300px", height: "300px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(250,204,21,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px", flexWrap: "wrap" }}>
          <div style={{
            padding: "8px 16px", borderRadius: "20px",
            background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.35)",
            fontSize: "11px", fontWeight: 700, color: "#facc15",
            letterSpacing: "0.12em", textTransform: "uppercase",
            animation: "pulseGreen 2s ease-in-out infinite",
          }}>
            LIVE MARKETPLACE
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {fetchStatus === "loading"
              ? "Fetching on-chain data..."
              : `${realCount > 0 ? `${realCount} on-chain · ` : ""}${displayNFTs.length} total assets`
            }
          </span>
          {fetchStatus === "loading" && (
            <div style={{
              display: "flex", gap: "4px", alignItems: "center",
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: "5px", height: "5px", borderRadius: "50%",
                  background: "#facc15", opacity: 0.7,
                  animation: `pulseGreen 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          )}
          {realCount > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "4px 12px", borderRadius: "20px",
              background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.35)",
              fontSize: "10px", fontWeight: 700, color: "var(--neon-green)",
              letterSpacing: "0.1em",
            }}>
              <span style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "var(--neon-green)",
                boxShadow: "0 0 6px var(--neon-green)",
                display: "inline-block",
                animation: "pulseGreen 2s ease-in-out infinite",
              }} />
              {realCount} VERIFIED ON-CHAIN
            </div>
          )}
        </div>

        <h1 style={{
          fontSize: "32px", fontWeight: 800, color: "#e2f0ff",
          letterSpacing: "-0.03em", lineHeight: 1.2, margin: "0 0 10px",
        }}>
          Discover & Collect{" "}
          <span style={{
            background: "linear-gradient(90deg, #facc15 0%, #f97316 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            Fankar NFTs
          </span>
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.7, margin: 0, maxWidth: "500px" }}>
          The premier marketplace for South Asian sports culture, creator content, and digital art — secured by AI and settled on WireFluid.
        </p>
      </div>

      {/* ── SECTION A: EXPLAINER CARDS ──────────────────────── */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#e2f0ff", margin: 0 }}>
            What can you collect?
          </h2>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
          {ASSET_TYPES.map(t => (
            <div key={t.title}
              style={{
                padding: "16px 14px", borderRadius: "12px",
                background: `linear-gradient(135deg, ${t.color}0f 0%, ${t.color}06 100%)`,
                border: `1px solid ${t.color}25`,
                transition: "all 0.2s ease", cursor: "default",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.border = `1px solid ${t.color}55`;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 16px ${t.color}14`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.border = `1px solid ${t.color}25`;
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>{t.icon}</div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: t.color, marginBottom: "6px", letterSpacing: "0.02em" }}>{t.title}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.5 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION B: NFT GALLERY ───────────────────────────── */}
      <div>
        {/* Gallery header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#e2f0ff", margin: 0 }}>
              Live on Market
            </h2>
            <span style={{
              padding: "2px 10px", borderRadius: "20px",
              background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)",
              fontSize: "10px", color: "var(--neon-green)", fontWeight: 700, letterSpacing: "0.08em",
            }}>
              {filtered.length} ITEMS
            </span>
          </div>
          {/* Filter tabs */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {FILTERS.map(f => {
              const active = f === activeFilter;
              return (
                <button key={f} onClick={() => setActiveFilter(f)} style={{
                  padding: "5px 12px", borderRadius: "8px",
                  border: active ? "1px solid rgba(0,180,255,0.5)" : "1px solid rgba(255,255,255,0.07)",
                  background: active ? "rgba(0,180,255,0.12)" : "rgba(255,255,255,0.03)",
                  color: active ? "#00b4ff" : "var(--text-muted)",
                  fontSize: "11px", fontWeight: active ? 600 : 400,
                  cursor: "pointer", transition: "all 0.15s ease", letterSpacing: "0.02em",
                }}>
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── NFT Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "16px" }}>
          {filtered.map(nft => {
            const hovered    = hoveredCard === nft.id;
            const imgFailed  = imgErrors[nft.id];
            const showImg    = nft.isReal && nft.imageUrl && !imgFailed;

            return (
              <div
                key={nft.id}
                onClick={() => openModal(nft)}
                onMouseEnter={() => setHoveredCard(nft.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  borderRadius: "14px",
                  overflow: "hidden",
                  background: "linear-gradient(180deg, rgba(13,31,53,0.95) 0%, rgba(8,18,36,0.95) 100%)",
                  border: hovered
                    ? `1px solid ${nft.categoryColor}55`
                    : nft.isReal
                      ? "1px solid rgba(0,255,136,0.22)"
                      : "1px solid rgba(255,255,255,0.07)",
                  boxShadow: hovered
                    ? `0 0 24px ${nft.categoryColor}20, 0 4px 20px rgba(0,0,0,0.4)`
                    : nft.isReal ? "0 0 12px rgba(0,255,136,0.07)" : "none",
                  transition: "all 0.22s ease",
                  transform: hovered ? "translateY(-4px)" : "none",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                {/* "LIVE ON-CHAIN" badge — real NFTs only */}
                {nft.isReal && (
                  <div style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "3px 9px",
                    borderRadius: "20px",
                    background: "rgba(0,0,0,0.75)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(0,255,136,0.55)",
                    boxShadow: "0 0 10px rgba(0,255,136,0.25)",
                  }}>
                    <span style={{
                      width: "5px", height: "5px", borderRadius: "50%",
                      background: "var(--neon-green)",
                      boxShadow: "0 0 6px var(--neon-green)",
                      display: "inline-block",
                      animation: "pulseGreen 1.8s ease-in-out infinite",
                    }} />
                    <span style={{
                      fontSize: "8px", fontWeight: 800,
                      color: "var(--neon-green)", letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}>
                      VERIFIED
                    </span>
                  </div>
                )}

                {/* ── Image area ── */}
                <div style={{
                  height: "160px",
                  position: "relative",
                  overflow: "hidden",
                  background: nft.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "52px",
                }}>
                  {/* Real NFT: actual image */}
                  {showImg && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={nft.imageUrl}
                      alt={nft.title}
                      onError={() => setImgErrors(prev => ({ ...prev, [nft.id]: true }))}
                      style={{
                        position: "absolute", inset: 0,
                        width: "100%", height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}

                  {/* Fallback / mock: emoji */}
                  {!showImg && <span style={{ position: "relative", zIndex: 1 }}>{nft.emoji}</span>}

                  {/* Shimmer overlay */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 55%)",
                    pointerEvents: "none",
                  }} />

                  {/* Category badge */}
                  <div style={{
                    position: "absolute", bottom: "10px", left: "10px",
                    padding: "3px 9px", borderRadius: "6px",
                    background: "rgba(0,0,0,0.70)", backdropFilter: "blur(6px)",
                    border: `1px solid ${nft.categoryColor}45`,
                    fontSize: "9px", fontWeight: 700,
                    color: nft.categoryColor, letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}>
                    {nft.category}
                  </div>

                  {/* Token ID chip — real NFTs */}
                  {nft.isReal && nft.tokenId !== undefined && (
                    <div style={{
                      position: "absolute", bottom: "10px", right: "10px",
                      padding: "3px 8px", borderRadius: "6px",
                      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      fontSize: "9px", color: "rgba(255,255,255,0.55)", fontFamily: "monospace",
                    }}>
                      #{nft.tokenId}
                    </div>
                  )}
                </div>

                {/* ── Card body ── */}
                <div style={{ padding: "14px" }}>
                  <div style={{
                    fontSize: "13px", fontWeight: 600, color: "#e2f0ff",
                    marginBottom: "8px", lineHeight: 1.3,
                    overflow: "hidden", textOverflow: "ellipsis",
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                  }}>
                    {nft.title}
                  </div>

                  {/* Uniqueness score — real NFTs only */}
                  {nft.isReal && (
                    <div style={{ marginBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                          AI Score
                        </span>
                        {nft.uniquenessScore && nft.uniquenessScore > 0 ? (
                          <span style={{ fontSize: "10px", color: "var(--neon-green)", fontWeight: 700 }}>
                            {(nft.uniquenessScore / 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>N/A</span>
                        )}
                      </div>
                      <div style={{ height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: nft.uniquenessScore && nft.uniquenessScore > 0
                            ? `${Math.min(nft.uniquenessScore / 100, 100)}%`
                            : "0%",
                          borderRadius: "2px",
                          background: "linear-gradient(90deg, var(--neon-green), #00b4ff)",
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div>
                      <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "2px" }}>
                        Price
                      </div>
                      {(() => {
                        const isNumeric = !isNaN(parseFloat(nft.price)) && nft.price !== "Not Listed";
                        return (
                          <div style={{ fontSize: isNumeric ? "16px" : "13px", fontWeight: 800, color: isNumeric ? "#facc15" : "var(--text-muted)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                            {nft.price}
                            {isNumeric && (
                              <span style={{ fontSize: "10px", color: "rgba(250,204,21,0.7)", marginLeft: "3px", fontWeight: 600 }}>WIRE</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "50%",
                      background: `${nft.categoryColor}15`,
                      border: `1px solid ${nft.categoryColor}35`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "16px",
                    }}>
                      {nft.emoji}
                    </div>
                  </div>

                  {/* BUY NOW button */}
                  <button
                    onClick={e => { e.stopPropagation(); openModal(nft); }}
                    style={{
                      width: "100%", padding: "9px 0",
                      borderRadius: "9px",
                      background: nft.isReal
                        ? hovered
                          ? `linear-gradient(135deg, rgba(0,255,136,0.28), rgba(0,180,255,0.18))`
                          : "linear-gradient(135deg, rgba(0,255,136,0.10), rgba(0,180,255,0.07))"
                        : hovered
                          ? `linear-gradient(135deg, ${nft.categoryColor}35, ${nft.categoryColor}18)`
                          : "rgba(255,255,255,0.04)",
                      border: nft.isReal
                        ? hovered
                          ? "1px solid rgba(0,255,136,0.7)"
                          : "1px solid rgba(0,255,136,0.35)"
                        : hovered
                          ? `1px solid ${nft.categoryColor}65`
                          : "1px solid rgba(255,255,255,0.08)",
                      color: nft.isReal
                        ? "var(--neon-green)"
                        : hovered ? nft.categoryColor : "var(--text-muted)",
                      fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
                      textTransform: "uppercase", cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: nft.isReal && hovered ? "0 0 14px rgba(0,255,136,0.3)" : "none",
                    }}
                  >
                    {nft.isReal ? "BUY NOW" : "BUY NOW"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading skeletons while real data is in-flight */}
        {fetchStatus === "loading" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "16px", marginTop: "16px" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                borderRadius: "14px",
                overflow: "hidden",
                background: "rgba(13,31,53,0.5)",
                border: "1px solid rgba(255,255,255,0.05)",
                animation: "pulseGreen 1.5s ease-in-out infinite",
                opacity: 0.5,
              }}>
                <div style={{ height: "160px", background: "rgba(0,255,136,0.05)" }} />
                <div style={{ padding: "14px" }}>
                  <div style={{ height: "12px", borderRadius: "4px", background: "rgba(255,255,255,0.08)", marginBottom: "10px", width: "80%" }} />
                  <div style={{ height: "10px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", marginBottom: "16px", width: "60%" }} />
                  <div style={{ height: "36px", borderRadius: "9px", background: "rgba(255,255,255,0.04)" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: "32px", padding: "20px", borderRadius: "12px",
          background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.05)",
          textAlign: "center",
        }}>
          {fetchStatus === "error" ? (
            <div style={{ fontSize: "12px", color: "rgba(255,140,100,0.8)" }}>
              Could not reach WireFluid RPC. Showing preview data — real NFTs will appear once the network is reachable.
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.7 }}>
              Full marketplace with live on-chain listings, bidding, and royalty distribution is{" "}
              <span style={{ color: "#facc15", fontWeight: 600 }}>coming soon</span>.{" "}
              Go to{" "}
              <span style={{ color: "var(--neon-green)" }}>Creator Studio</span>
              {" "}in the sidebar to mint your own NFT now.
            </div>
          )}
        </div>
      </div>

      {/* ── Asset Details Modal ── */}
      {selectedNFT != null && (
        <AssetDetailsModal
          nft={selectedNFT}
          onClose={() => setSelectedNFT(null)}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </div>
  );
}
