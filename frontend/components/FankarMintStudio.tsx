"use client";

/**
 * FankarMintStudio.tsx
 * ─────────────────────
 * Dynamic minting studio for all 5 Fankar Protocol categories.
 * Switches form fields based on the active sidebar tab.
 */

import { useState, useRef, useCallback, type ChangeEvent } from "react";
import { ethers } from "ethers";
import FankarNFTAbi from "./FankarNFT.json";

// ── Constants ────────────────────────────────────────────────
const AI_API_URL       = "http://127.0.0.1:8000/api/v1/mint-asset";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const WIREFLUID_CHAIN_ID = 92533;

// ── Tab definitions ──────────────────────────────────────────
type TabId = "kit_design" | "gully2psl" | "viral_memes" | "influencers" | "creators_hub";

interface TabConfig {
  id:          TabId;
  label:       string;
  icon:        string;
  color:       string;      // accent colour
  fileLabel:   string;      // upload zone label
  nameLabel:   string;      // primary text field label
  namePlaceholder: string;
  extraLabel?: string;      // secondary tab-specific field label
  extraPlaceholder?: string;
  extraType?:  "text" | "number" | "select";
  extraOptions?: string[];  // for select type
  showBowling: boolean;     // whether to display bowling speed on success screen
}

const TABS: TabConfig[] = [
  {
    id:               "kit_design",
    label:            "Kit Design",
    icon:             "🎽",
    color:            "#00ff88",
    fileLabel:        "Kit Design Image",
    nameLabel:        "Kit Title",
    namePlaceholder:  "e.g. Lahore Qalandars Home Kit 2026",
    extraLabel:       "Description",
    extraPlaceholder: "Describe the kit design, season, and franchise...",
    extraType:        "text",
    showBowling:      false,
  },
  {
    id:               "gully2psl",
    label:            "Gully2PSL",
    icon:             "🏏",
    color:            "#facc15",
    fileLabel:        "Player Image / Video",
    nameLabel:        "Player Name",
    namePlaceholder:  "e.g. Babar Azam",
    extraLabel:       "Bowling Speed (km/h)",
    extraPlaceholder: "e.g. 145",
    extraType:        "number",
    showBowling:      true,
  },
  {
    id:               "viral_memes",
    label:            "Viral Memes",
    icon:             "🔥",
    color:            "#f97316",
    fileLabel:        "Meme Image",
    nameLabel:        "Meme Title",
    namePlaceholder:  "e.g. He Said What?",
    extraLabel:       "Category",
    extraPlaceholder: "e.g. Cricket, PSL, Bollywood...",
    extraType:        "select",
    extraOptions:     ["Cricket", "PSL", "Football", "Bollywood", "Politics", "Tech", "Other"],
    showBowling:      false,
  },
  {
    id:               "influencers",
    label:            "Influencers",
    icon:             "⭐",
    color:            "#a855f7",
    fileLabel:        "Profile Photo",
    nameLabel:        "Handle / Username",
    namePlaceholder:  "e.g. @shahidafridi",
    extraLabel:       "Niche",
    extraPlaceholder: "e.g. Sports, Comedy, Fashion...",
    extraType:        "select",
    extraOptions:     ["Sports", "Comedy", "Fashion", "Music", "Food", "Gaming", "Tech", "Lifestyle", "Other"],
    showBowling:      false,
  },
  {
    id:               "creators_hub",
    label:            "Creators Hub",
    icon:             "🎨",
    color:            "#00b4ff",
    fileLabel:        "Artwork / Creation",
    nameLabel:        "Artwork Title",
    namePlaceholder:  "e.g. Green Fields at Dusk",
    extraLabel:       "Medium",
    extraPlaceholder: "e.g. Digital Art, Oil Painting, Photography...",
    extraType:        "select",
    extraOptions:     ["Digital Art", "Photography", "Oil Painting", "Watercolour", "3D Art", "Illustration", "Other"],
    showBowling:      false,
  },
];

// ── Mint step types ──────────────────────────────────────────
type MintStep = "idle" | "connecting" | "analyzing" | "waiting_confirm" | "minting" | "success" | "error";

const STEP_LABELS: { key: MintStep; label: string }[] = [
  { key: "connecting",      label: "Connect Wallet"   },
  { key: "analyzing",       label: "AI Analysis"      },
  { key: "waiting_confirm", label: "Confirm in Wallet" },
  { key: "minting",         label: "Minting on-chain" },
  { key: "success",         label: "Minted!"           },
];
const STEP_INDEX: Partial<Record<MintStep, number>> = {
  connecting: 0, analyzing: 1, waiting_confirm: 2, minting: 3, success: 4,
};

// ── API response ─────────────────────────────────────────────
interface AiApiResponse {
  token_uri:        string;
  signature:        string;
  nonce:            string;   // string for full 64-bit precision (no JS float rounding)
  uniqueness_score: number;
  bowling_speed:    number;
  confidence:       number;
  ai_verdict:       string;
  image_url:        string;
  metadata_cid:     string;
  creator_address:  string;
  brand_address:    string;
}

interface MintResult {
  tokenId:       string;
  txHash:        string;
  tokenUri:      string;
  aiData:        AiApiResponse;
  listingPrice:  string;      // WIRE amount the user set
  bowlingSpeed:  string;      // user-inputted km/h (Gully2PSL only)
  activeTab:     TabId;
}

// ── Window extension for MetaMask ────────────────────────────
declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

// ── Shared input style ────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "9px",
  background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(0,255,136,0.15)",
  color: "#e2f0ff",
  fontSize: "14px",
  outline: "none",
  transition: "border-color 0.2s ease",
  boxSizing: "border-box",
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function FankarMintStudio({ initialTab }: { initialTab?: TabId }) {
  const [activeTab,     setActiveTab]     = useState<TabId>(initialTab ?? "kit_design");
  const [file,          setFile]          = useState<File | null>(null);
  const [preview,       setPreview]       = useState<string | null>(null);
  const [name,          setName]          = useState("");
  const [description,   setDescription]  = useState("");   // Kit Design + fallback
  const [extraField,    setExtraField]    = useState("");   // tab-specific secondary field
  const [listingPrice,  setListingPrice]  = useState("");   // WIRE
  const [step,          setStep]          = useState<MintStep>("idle");
  const [statusMsg,     setStatusMsg]     = useState("");
  const [error,         setError]         = useState<string | null>(null);
  const [result,        setResult]        = useState<MintResult | null>(null);
  const [walletAddr,    setWalletAddr]    = useState<string | null>(null);
  const [aiData,        setAiData]        = useState<AiApiResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const tab = TABS.find(t => t.id === activeTab)!;
  const accentColor = tab.color;

  // ── Tab switch (also resets form) ───────────────────────────
  const switchTab = (id: TabId) => {
    setActiveTab(id);
    setFile(null);
    setPreview(null);
    setName("");
    setDescription("");
    setExtraField("");
    setError(null);
    setStep("idle");
    setStatusMsg("");
    setResult(null);
    setAiData(null);
  };

  // ── File handling ────────────────────────────────────────────
  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }, []);

  // ── Reset ────────────────────────────────────────────────────
  const reset = () => {
    setFile(null); setPreview(null); setName(""); setDescription("");
    setExtraField(""); setListingPrice(""); setStep("idle");
    setStatusMsg(""); setError(null); setResult(null); setAiData(null);
  };

  // ── Helpers for extra field ──────────────────────────────────
  // For Gully2PSL, extraField is bowling speed (user-entered km/h).
  // For others, extraField is category / niche / medium / description.
  const getBowlingSpeed = (): string => {
    if (activeTab === "gully2psl") return extraField || "0";
    return "0";
  };

  // The "description" actually sent to the backend:
  const getDescription = (): string => {
    if (activeTab === "kit_design") return description;
    // For other tabs the secondary field IS the description-equivalent
    return extraField || name;
  };

  // ─────────────────────────────────────────────────────────
  // MAIN MINT FLOW
  // ─────────────────────────────────────────────────────────
  const handleMint = async () => {
    setError(null);

    if (!file)                  return setError("Please upload a file.");
    if (!name.trim())           return setError("Please fill in the primary name/title field.");
    if (!CONTRACT_ADDRESS)      return setError("Contract address not configured (NEXT_PUBLIC_CONTRACT_ADDRESS).");
    if (activeTab === "gully2psl" && (!extraField || Number(extraField) <= 0))
      return setError("Please enter a valid bowling speed in km/h.");

    try {
      // ── 1. Connect MetaMask ────────────────────────────────
      setStep("connecting");
      setStatusMsg("Connecting to MetaMask...");

      if (!window.ethereum) throw new Error("MetaMask is not installed.");

      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.length) throw new Error("No accounts found. Please unlock MetaMask.");

      const minterAddress = ethers.getAddress(accounts[0]);
      setWalletAddr(minterAddress);

      // Switch to WireFluid
      const chainHex = `0x${WIREFLUID_CHAIN_ID.toString(16)}`;
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
      } catch (err: unknown) {
        if ((err as { code?: number }).code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: chainHex, chainName: "WireFluid",
              nativeCurrency: { name: "WIRE", symbol: "WIRE", decimals: 18 },
              rpcUrls: ["https://evm.wirefluid.com"],
              blockExplorerUrls: ["https://explorer.wirefluid.com"],
            }],
          });
        } else throw new Error("Please switch MetaMask to WireFluid (Chain ID 92533).");
      }
      setStatusMsg(`Wallet connected: ${minterAddress.slice(0, 6)}...${minterAddress.slice(-4)}`);

      // ── 2. Call AI Gatekeeper API ──────────────────────────
      setStep("analyzing");
      setStatusMsg("Uploading to AI — analysing originality & uniqueness...");

      const formData = new FormData();
      formData.append("file",                 file);
      formData.append("name",                 name.trim());
      formData.append("description",          getDescription().trim() || name.trim());
      formData.append("feature_type",         activeTab);
      formData.append("minter_address",       minterAddress);
      formData.append("creator_address",      minterAddress);
      formData.append("brand_address",        minterAddress);
      formData.append("mint_fee",             "0");
      formData.append("listing_price_wire",   listingPrice || "0");
      formData.append("bowling_speed_input",  getBowlingSpeed());

      const apiResponse = await fetch(AI_API_URL, { method: "POST", body: formData });
      if (!apiResponse.ok) {
        const errData = await apiResponse.json().catch(() => ({ detail: "Unknown AI error" }));
        throw new Error(`AI Gatekeeper: ${errData.detail ?? apiResponse.statusText}`);
      }

      const apiData: AiApiResponse = await apiResponse.json();
      setAiData(apiData);

      const formattedSignature = apiData.signature.startsWith("0x")
        ? apiData.signature : `0x${apiData.signature}`;

      setStatusMsg(
        `AI approved — Uniqueness: ${(apiData.uniqueness_score / 100).toFixed(1)}%` +
        (apiData.bowling_speed > 0 ? `  |  Speed: ${(apiData.bowling_speed / 100).toFixed(1)} km/h` : "")
      );

      // ── 3. Smart-contract call ─────────────────────────────
      setStep("waiting_confirm");
      setStatusMsg("Please confirm the transaction in MetaMask...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, FankarNFTAbi, signer);

      const tx = await contract.mintFankarAsset(
        apiData.creator_address,
        apiData.brand_address,
        apiData.token_uri,
        BigInt(0),
        BigInt(apiData.bowling_speed),
        BigInt(apiData.uniqueness_score),
        BigInt(apiData.nonce),       // nonce is a string — BigInt() handles it exactly
        formattedSignature,
        { value: BigInt(0) },
      );

      setStep("minting");
      setStatusMsg(`Transaction submitted — Tx: ${tx.hash.slice(0, 10)}...`);

      const receipt = await tx.wait(1);
      if (receipt.status === 0) throw new Error("Transaction reverted on-chain.");

      // Parse tokenId from AssetMinted event
      let mintedTokenId = "N/A";
      try {
        const iface  = new ethers.Interface(FankarNFTAbi);
        const parsed = receipt.logs
          .map((log: { topics: string[]; data: string }) => {
            try { return iface.parseLog(log); } catch { return null; }
          })
          .find((e: { name: string } | null) => e?.name === "AssetMinted");
        if (parsed) mintedTokenId = parsed.args.tokenId.toString();
      } catch { /* non-critical */ }

      setResult({
        tokenId:      mintedTokenId,
        txHash:       receipt.hash,
        tokenUri:     apiData.token_uri,
        aiData:       apiData,
        listingPrice: listingPrice || "0",
        bowlingSpeed: extraField || "0",
        activeTab,
      });
      setStep("success");
      setStatusMsg("Your Fankar NFT has been minted on WireFluid!");

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setStep("error");
      setStatusMsg("");
    }
  };

  // ─────────────────────────────────────────────────────────
  // RENDER helpers
  // ─────────────────────────────────────────────────────────
  const currentStepIndex = STEP_INDEX[step] ?? -1;
  const isProcessing = !["idle", "success", "error"].includes(step);

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    color: "var(--text-muted)",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: "8px",
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>

      {/* ── TAB BAR ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "24px",
          padding: "6px",
          background: "rgba(0,0,0,0.35)",
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.06)",
          overflowX: "auto",
        }}
      >
        {TABS.map(t => {
          const active = t.id === activeTab;
          return (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              disabled={isProcessing}
              style={{
                flex: "1 0 auto",
                padding: "9px 14px",
                borderRadius: "10px",
                border: "none",
                cursor: isProcessing ? "not-allowed" : "pointer",
                background: active
                  ? `linear-gradient(135deg, ${t.color}22, ${t.color}10)`
                  : "transparent",
                borderTop: active ? `2px solid ${t.color}` : "2px solid transparent",
                color: active ? t.color : "var(--text-muted)",
                fontSize: "12px",
                fontWeight: active ? 700 : 400,
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                justifyContent: "center",
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── PROGRESS BAR ────────────────────────────────────── */}
      {step !== "idle" && (
        <div
          style={{
            display: "flex",
            gap: "6px",
            marginBottom: "20px",
            padding: "14px 18px",
            background: "rgba(13,31,53,0.8)",
            borderRadius: "12px",
            border: `1px solid ${accentColor}18`,
            overflowX: "auto",
          }}
        >
          {STEP_LABELS.map((s, idx) => {
            const done    = idx < currentStepIndex;
            const active  = idx === currentStepIndex;
            return (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <div
                  style={{
                    width: "26px", height: "26px", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px",
                    background: done ? `${accentColor}25` : active ? `${accentColor}15` : "rgba(255,255,255,0.04)",
                    border: done ? `1px solid ${accentColor}60` : active ? `1px solid ${accentColor}` : "1px solid rgba(255,255,255,0.1)",
                    boxShadow: active ? `0 0 10px ${accentColor}40` : "none",
                    animation: active ? "pulseGreen 1.5s ease-in-out infinite" : "none",
                    transition: "all 0.3s",
                    color: done ? accentColor : active ? "#e2f0ff" : "var(--text-muted)",
                  }}
                >
                  {done ? "✓" : idx + 1}
                </div>
                <span style={{ fontSize: "11px", color: done ? accentColor : active ? "#e2f0ff" : "var(--text-muted)", fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>
                  {s.label}
                </span>
                {idx < STEP_LABELS.length - 1 && (
                  <span style={{ fontSize: "10px", color: done ? `${accentColor}50` : "rgba(255,255,255,0.1)", margin: "0 2px" }}>—</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── STATUS MESSAGE ───────────────────────────────────── */}
      {statusMsg && (
        <div style={{
          padding: "12px 16px", marginBottom: "18px", borderRadius: "10px",
          background: `${accentColor}0a`, border: `1px solid ${accentColor}30`,
          fontSize: "13px", color: "#a8e8c8",
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          {isProcessing && (
            <span style={{
              width: "14px", height: "14px", borderRadius: "50%",
              border: `2px solid ${accentColor}30`, borderTop: `2px solid ${accentColor}`,
              display: "inline-block", animation: "spin 0.8s linear infinite", flexShrink: 0,
            }} />
          )}
          {statusMsg}
        </div>
      )}

      {/* ── ERROR MESSAGE ────────────────────────────────────── */}
      {error && (
        <div style={{
          padding: "12px 16px", marginBottom: "18px", borderRadius: "10px",
          background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.3)",
          fontSize: "13px", color: "#ff8080",
          display: "flex", gap: "10px", alignItems: "flex-start",
        }}>
          <span style={{ flexShrink: 0 }}>!</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── SUCCESS CARD ─────────────────────────────────────── */}
      {step === "success" && result && (() => {
        const cfg = TABS.find(t => t.id === result.activeTab)!;
        const ac  = cfg.color;

        // Build stat cards dynamically based on active tab
        const stats: { label: string; value: string }[] = [
          { label: "Token ID",         value: `#${result.tokenId}` },
          { label: "Uniqueness Score", value: `${(result.aiData.uniqueness_score / 100).toFixed(1)}%` },
          { label: "AI Confidence",    value: `${(result.aiData.confidence * 100).toFixed(0)}%` },
          { label: "Listing Price",    value: result.listingPrice !== "0" ? `${result.listingPrice} WIRE` : "Free" },
        ];

        if (cfg.showBowling && result.aiData.bowling_speed > 0) {
          stats.push({ label: "Bowling Speed", value: `${result.bowlingSpeed} km/h` });
        }

        if (cfg.id === "viral_memes" || cfg.id === "influencers" || cfg.id === "creators_hub") {
          const extraVal = result.aiData.ai_verdict.split(".")[0]; // short verdict
          stats.push({ label: cfg.extraLabel ?? "Category", value: extraVal });
        }

        return (
          <div style={{
            marginBottom: "24px", padding: "24px", borderRadius: "16px",
            background: `linear-gradient(135deg, ${ac}14 0%, ${ac}07 100%)`,
            border: `1px solid ${ac}40`,
            boxShadow: `0 0 30px ${ac}18`,
          }}>
            <div style={{ fontSize: "17px", fontWeight: 700, color: ac, marginBottom: "18px" }}>
              {cfg.icon} NFT Minted on WireFluid!
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              {stats.map(s => (
                <div key={s.label} style={{
                  padding: "12px 14px", borderRadius: "10px",
                  background: "rgba(0,0,0,0.25)", border: `1px solid ${ac}18`,
                }}>
                  <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "5px" }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#e2f0ff" }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Tx link */}
            <div style={{
              padding: "10px 14px", borderRadius: "8px",
              background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)",
              fontSize: "11px", fontFamily: "monospace", color: "var(--text-muted)",
              wordBreak: "break-all", marginBottom: "14px",
            }}>
              <span style={{ color: ac, marginRight: "6px" }}>Tx:</span>
              <a href={`https://explorer.wirefluid.com/tx/${result.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "#00b4ff" }}>
                {result.txHash.slice(0, 22)}...{result.txHash.slice(-8)}
              </a>
            </div>

            <button onClick={reset} style={{
              width: "100%", padding: "10px", borderRadius: "8px",
              background: `${ac}12`, border: `1px solid ${ac}30`,
              color: ac, fontSize: "13px", fontWeight: 600, cursor: "pointer",
              letterSpacing: "0.05em",
            }}>
              Mint Another {cfg.label} Asset
            </button>
          </div>
        );
      })()}

      {/* ── FORM ─────────────────────────────────────────────── */}
      {step !== "success" && (
        <div style={{
          background: "linear-gradient(135deg, rgba(13,31,53,0.92) 0%, rgba(8,18,36,0.92) 100%)",
          border: `1px solid ${accentColor}18`,
          borderRadius: "16px", padding: "28px",
        }}>

          {/* ── Tab header ── */}
          <div style={{ marginBottom: "22px" }}>
            <span style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: accentColor, fontWeight: 600 }}>
              {tab.icon}  {tab.label}
            </span>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#e2f0ff", margin: "6px 0 0", letterSpacing: "-0.02em" }}>
              Mint Your {tab.label} NFT
            </h2>
          </div>

          {/* ── File Upload ── */}
          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>{tab.fileLabel}</label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${preview ? `${accentColor}60` : `${accentColor}25`}`,
                borderRadius: "12px", padding: "8px", cursor: isProcessing ? "not-allowed" : "pointer",
                transition: "border-color 0.2s ease", overflow: "hidden",
                minHeight: preview ? "auto" : "150px", display: "flex",
                alignItems: "center", justifyContent: "center",
                background: `${accentColor}04`, position: "relative",
              }}
            >
              {preview ? (
                <div style={{ width: "100%", position: "relative" }}>
                  <img src={preview} alt="Preview" style={{ width: "100%", maxHeight: "240px", objectFit: "contain", borderRadius: "8px" }} />
                  {!isProcessing && (
                    <div style={{
                      position: "absolute", top: "8px", right: "8px",
                      background: "rgba(0,0,0,0.7)", border: `1px solid ${accentColor}40`,
                      borderRadius: "6px", padding: "3px 10px",
                      fontSize: "11px", color: accentColor,
                    }}>
                      Click to change
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <div style={{ fontSize: "32px", marginBottom: "10px" }}>
                    {tab.icon}
                  </div>
                  <div style={{ fontSize: "13px", color: "#a8c8e8", marginBottom: "4px" }}>
                    Drag & drop or click to upload
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    PNG, JPG, GIF, WebP, MP4 — max 10 MB
                  </div>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} disabled={isProcessing} style={{ display: "none" }} />
            {file && (
              <div style={{ marginTop: "5px", fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </div>
            )}
          </div>

          {/* ── Primary name/title field ── */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>{tab.nameLabel}</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              disabled={isProcessing} placeholder={tab.namePlaceholder}
              style={{ ...inputStyle, opacity: isProcessing ? 0.5 : 1 }}
              onFocus={e => (e.target.style.borderColor = `${accentColor}60`)}
              onBlur={e  => (e.target.style.borderColor = "rgba(0,255,136,0.15)")}
            />
          </div>

          {/* ── Kit Design description (only for kit_design) ── */}
          {activeTab === "kit_design" && (
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Description</label>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)}
                disabled={isProcessing} rows={3}
                placeholder="Describe the kit design, season, and franchise..."
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", opacity: isProcessing ? 0.5 : 1 }}
                onFocus={e => (e.target.style.borderColor = `${accentColor}60`)}
                onBlur={e  => (e.target.style.borderColor = "rgba(0,255,136,0.15)")}
              />
            </div>
          )}

          {/* ── Tab-specific extra field ── */}
          {tab.extraLabel && activeTab !== "kit_design" && (
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>{tab.extraLabel}</label>

              {tab.extraType === "number" ? (
                <input
                  type="number" value={extraField} onChange={e => setExtraField(e.target.value)}
                  disabled={isProcessing} placeholder={tab.extraPlaceholder} min="1" max="250"
                  style={{ ...inputStyle, opacity: isProcessing ? 0.5 : 1 }}
                  onFocus={e => (e.target.style.borderColor = `${accentColor}60`)}
                  onBlur={e  => (e.target.style.borderColor = "rgba(0,255,136,0.15)")}
                />
              ) : tab.extraType === "select" ? (
                <select
                  value={extraField} onChange={e => setExtraField(e.target.value)}
                  disabled={isProcessing}
                  style={{ ...inputStyle, opacity: isProcessing ? 0.5 : 1, cursor: "pointer" }}
                >
                  <option value="" disabled>Select {tab.extraLabel}...</option>
                  {tab.extraOptions?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text" value={extraField} onChange={e => setExtraField(e.target.value)}
                  disabled={isProcessing} placeholder={tab.extraPlaceholder}
                  style={{ ...inputStyle, opacity: isProcessing ? 0.5 : 1 }}
                  onFocus={e => (e.target.style.borderColor = `${accentColor}60`)}
                  onBlur={e  => (e.target.style.borderColor = "rgba(0,255,136,0.15)")}
                />
              )}
            </div>
          )}

          {/* ── Listing Price ── */}
          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>Listing Price (WIRE) — Optional</label>
            <div style={{ position: "relative" }}>
              <input
                type="number" value={listingPrice} onChange={e => setListingPrice(e.target.value)}
                disabled={isProcessing} placeholder="0 — leave blank for free mint"
                min="0" step="0.001"
                style={{
                  ...inputStyle,
                  paddingRight: "60px",
                  opacity: isProcessing ? 0.5 : 1,
                  borderColor: "rgba(250,204,21,0.25)",
                }}
                onFocus={e => (e.target.style.borderColor = "#facc1570")}
                onBlur={e  => (e.target.style.borderColor = "rgba(250,204,21,0.25)")}
              />
              <span style={{
                position: "absolute", right: "14px", top: "50%",
                transform: "translateY(-50%)",
                fontSize: "12px", fontWeight: 700, color: "#facc15",
                pointerEvents: "none",
              }}>
                WIRE
              </span>
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "5px" }}>
              Stored in NFT metadata as your desired secondary-market listing price.
            </div>
          </div>

          {/* ── Connected wallet pill ── */}
          {walletAddr && (
            <div style={{
              marginBottom: "16px", padding: "8px 14px", borderRadius: "8px",
              background: `${accentColor}09`, border: `1px solid ${accentColor}20`,
              fontSize: "12px", color: "var(--text-muted)", fontFamily: "monospace",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: accentColor, boxShadow: `0 0 6px ${accentColor}`, flexShrink: 0, animation: "pulseGreen 2s ease-in-out infinite" }} />
              {walletAddr}
            </div>
          )}

          {/* ── AI preview (between analysis and confirm) ── */}
          {aiData && step === "waiting_confirm" && (
            <div style={{
              marginBottom: "16px", padding: "14px", borderRadius: "10px",
              background: "rgba(0,180,255,0.06)", border: "1px solid rgba(0,180,255,0.2)",
            }}>
              <div style={{ fontSize: "11px", color: "#00b4ff", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
                AI Analysis Complete
              </div>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Uniqueness </span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: accentColor }}>
                    {(aiData.uniqueness_score / 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Confidence </span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#a8c8e8" }}>
                    {(aiData.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                {tab.showBowling && aiData.bowling_speed > 0 && (
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Speed </span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#facc15" }}>
                      {extraField} km/h
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MINT BUTTON ── */}
          <button
            onClick={handleMint} disabled={isProcessing}
            style={{
              width: "100%", padding: "15px", borderRadius: "12px",
              background: isProcessing
                ? `${accentColor}0d`
                : `linear-gradient(135deg, ${accentColor}30, ${accentColor}15)`,
              border: `1px solid ${isProcessing ? `${accentColor}20` : `${accentColor}70`}`,
              color: isProcessing ? `${accentColor}60` : accentColor,
              fontSize: "15px", fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", cursor: isProcessing ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: isProcessing ? "none" : `0 0 22px ${accentColor}20`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            }}
            onMouseEnter={e => { if (!isProcessing) { (e.currentTarget).style.boxShadow = `0 0 36px ${accentColor}38`; } }}
            onMouseLeave={e => { if (!isProcessing) { (e.currentTarget).style.boxShadow = `0 0 22px ${accentColor}20`; } }}
          >
            {isProcessing ? (
              <>
                <span style={{
                  width: "16px", height: "16px", borderRadius: "50%",
                  border: `2px solid ${accentColor}20`, borderTop: `2px solid ${accentColor}70`,
                  animation: "spin 0.8s linear infinite", flexShrink: 0,
                }} />
                {step === "connecting"      && "Connecting Wallet..."}
                {step === "analyzing"       && "Analysing with AI..."}
                {step === "waiting_confirm" && "Confirm in MetaMask..."}
                {step === "minting"         && "Minting on WireFluid..."}
              </>
            ) : (
              `Mint ${tab.label} NFT`
            )}
          </button>

          <p style={{ marginTop: "12px", textAlign: "center", fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.5 }}>
            AI-verified  ·  IPFS storage  ·  WireFluid Chain 92533
          </p>
        </div>
      )}

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
