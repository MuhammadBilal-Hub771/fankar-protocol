"use client";

/**
 * AssetDetailsModal.tsx
 * ──────────────────────
 * Full-screen overlay showing NFT detail + media (image or video).
 * Handles real MetaMask purchases on WireFluid via ethers.js v6.
 */

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import type { DisplayNFT } from "./BuyersMarketplace";

// ── Chain config ──────────────────────────────────────────────
const CONTRACT_ADDRESS   = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "0x1ea087D98c3bfDec3eFd00c85E14F09727d30C69";
const WIREFLUID_CHAIN_ID = 92533;
const WIREFLUID_HEX      = "0x" + WIREFLUID_CHAIN_ID.toString(16); // "0x169c5"

// ── Step machine ──────────────────────────────────────────────
type BuyStep = "idle" | "connecting" | "switching" | "sending" | "confirming" | "success" | "error";

const STEP_LABEL: Record<BuyStep, string> = {
  idle:       "CONFIRM PURCHASE",
  connecting: "Connecting Wallet…",
  switching:  "Switching to WireFluid…",
  sending:    "Confirm in MetaMask…",
  confirming: "Mining Transaction…",
  success:    "✓  Purchase Complete!",
  error:      "RETRY",
};
const STEP_BUSY: Record<BuyStep, boolean> = {
  idle: false, connecting: true, switching: true, sending: true, confirming: true, success: true, error: false,
};

// ── Helpers ───────────────────────────────────────────────────
function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

function shortenHash(h: string) {
  return `${h.slice(0, 10)}…${h.slice(-8)}`;
}

// ── Props ─────────────────────────────────────────────────────
interface Props {
  nft:       DisplayNFT;
  onClose:   () => void;
  onSuccess: (nft: DisplayNFT, txHash: string) => void;
}

// ─────────────────────────────────────────────────────────────
export default function AssetDetailsModal({ nft, onClose, onSuccess }: Props) {
  const [step,     setStep]     = useState<BuyStep>("idle");
  const [txHash,   setTxHash]   = useState("");
  const [errMsg,   setErrMsg]   = useState("");
  const [imgError, setImgError] = useState(false);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── MetaMask buy flow ────────────────────────────────────────
  const handleBuy = async () => {
    if (STEP_BUSY[step]) return;
    setErrMsg("");

    // Mock NFTs: show a simulated success — great for demos
    if (!nft.isReal) {
      setStep("connecting");
      await new Promise(r => setTimeout(r, 700));
      setStep("sending");
      await new Promise(r => setTimeout(r, 900));
      setStep("confirming");
      await new Promise(r => setTimeout(r, 1000));
      const mockHash = "0x" + Math.random().toString(16).slice(2).padEnd(64, "0");
      setTxHash(mockHash);
      setStep("success");
      onSuccess(nft, mockHash);
      return;
    }

    try {
      // 1. Wallet connection
      setStep("connecting");
      const win = window as { ethereum?: ethers.Eip1193Provider };
      if (!win.ethereum) throw new Error("MetaMask not detected. Please install MetaMask first.");
      const provider = new ethers.BrowserProvider(win.ethereum);
      await provider.send("eth_requestAccounts", []);

      // 2. Network switch
      setStep("switching");
      try {
        await provider.send("wallet_switchEthereumChain", [{ chainId: WIREFLUID_HEX }]);
      } catch (sw: unknown) {
        const code = (sw as { code?: number }).code;
        if (code === 4902) {
          await provider.send("wallet_addEthereumChain", [{
            chainId:         WIREFLUID_HEX,
            chainName:       "WireFluid",
            rpcUrls:         ["https://evm.wirefluid.com"],
            nativeCurrency:  { name: "WIRE", symbol: "WIRE", decimals: 18 },
            blockExplorerUrls: [],
          }]);
        } else {
          throw sw;
        }
      }

      // 3. Build & send transaction
      setStep("sending");
      const signer   = await provider.getSigner();
      const priceNum = parseFloat(nft.price);
      const value    = !isNaN(priceNum) && priceNum > 0
        ? ethers.parseEther(String(priceNum))
        : ethers.parseEther("0.01"); // demo fallback

      const tx = await signer.sendTransaction({ to: CONTRACT_ADDRESS, value });

      // 4. Wait for 1 confirmation
      setStep("confirming");
      const receipt = await tx.wait(1);
      const hash    = receipt?.hash ?? tx.hash;

      setTxHash(hash);
      setStep("success");
      onSuccess(nft, hash);

    } catch (err: unknown) {
      const e = err as { code?: number | string; message?: string };
      if (e.code === 4001 || e.code === "ACTION_REJECTED") {
        setErrMsg("Transaction rejected. You can retry whenever you're ready.");
      } else {
        setErrMsg(e.message?.slice(0, 140) ?? "Unknown error. Check MetaMask and try again.");
      }
      setStep("error");
    }
  };

  const retry = () => { setStep("idle"); setErrMsg(""); };

  // ── Derived flags ─────────────────────────────────────────────
  const color    = nft.categoryColor;
  const videoUrl = isVideoUrl(nft.imageUrl) ? nft.imageUrl : undefined;
  const showImg  = !videoUrl && !!nft.imageUrl && !imgError;
  const priceNum = parseFloat(nft.price);
  const hasPrice = !isNaN(priceNum) && nft.price !== "Not Listed";
  const busy     = STEP_BUSY[step];

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      {/* ── Overlay ── */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.82)",
          backdropFilter: "blur(14px)",
          animation: "mOverlayIn 0.22s ease forwards",
        }}
      />

      {/* ── Modal card ── */}
      <div
        role="dialog"
        aria-modal
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 301,
          width: "min(92vw, 740px)",
          maxHeight: "92vh",
          overflowY: "auto",
          borderRadius: "22px",
          background: "linear-gradient(175deg, rgba(10,26,50,0.99) 0%, rgba(4,11,22,0.99) 100%)",
          border: `1px solid ${color}30`,
          boxShadow: `0 0 80px ${color}14, 0 32px 80px rgba(0,0,0,0.7)`,
          animation: "mCardIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        {/* ── Close button ── */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: "14px", right: "14px",
            width: "30px", height: "30px", borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "#a8c8e8", fontSize: "14px",
            cursor: "pointer", zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.14)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
        >
          ✕
        </button>

        {/* ── Media area ── */}
        <div style={{
          width: "100%", height: "300px",
          position: "relative", overflow: "hidden",
          background: nft.gradient,
          borderRadius: "22px 22px 0 0",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "80px",
        }}>
          {/* Video */}
          {videoUrl && (
            <video
              src={videoUrl}
              autoPlay
              controls
              muted
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}

          {/* Image */}
          {showImg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={nft.imageUrl}
              alt={nft.title}
              onError={() => setImgError(true)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}

          {/* Emoji fallback */}
          {!videoUrl && !showImg && (
            <span style={{ position: "relative", zIndex: 1, filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))" }}>
              {nft.emoji}
            </span>
          )}

          {/* Bottom gradient scrim */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(4,11,22,0.92) 0%, transparent 55%)",
            pointerEvents: "none",
          }} />

          {/* Top-left badges */}
          <div style={{ position: "absolute", top: "14px", left: "14px", display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{
              padding: "4px 12px", borderRadius: "8px",
              background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)",
              border: `1px solid ${color}50`,
              fontSize: "10px", fontWeight: 700, color,
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>
              {nft.category}
            </div>
            {nft.isReal && (
              <div style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "4px 10px", borderRadius: "20px",
                background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)",
                border: "1px solid rgba(0,255,136,0.55)",
                boxShadow: "0 0 10px rgba(0,255,136,0.22)",
              }}>
                <span style={{
                  width: "5px", height: "5px", borderRadius: "50%",
                  background: "var(--neon-green)", boxShadow: "0 0 6px var(--neon-green)",
                  display: "inline-block", animation: "pulseGreen 1.8s ease-in-out infinite",
                }} />
                <span style={{ fontSize: "9px", fontWeight: 800, color: "var(--neon-green)", letterSpacing: "0.1em" }}>
                  LIVE ON-CHAIN
                </span>
              </div>
            )}
          </div>

          {/* Token ID chip */}
          {nft.tokenId !== undefined && (
            <div style={{
              position: "absolute", top: "14px", right: "50px",
              padding: "4px 10px", borderRadius: "8px",
              background: "rgba(0,0,0,0.68)", backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: "10px", color: "rgba(255,255,255,0.55)", fontFamily: "monospace",
            }}>
              Token #{nft.tokenId}
            </div>
          )}
        </div>

        {/* ── Details panel ── */}
        <div style={{ padding: "26px 30px 30px" }}>

          {/* Title */}
          <h2 style={{
            fontSize: "22px", fontWeight: 800, color: "#e2f0ff",
            margin: "0 0 22px", lineHeight: 1.25, paddingRight: "36px",
          }}>
            {nft.title}
          </h2>

          {/* ── Stat row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "22px" }}>

            {/* Price */}
            <div style={{
              padding: "14px 16px", borderRadius: "12px",
              background: "rgba(250,204,21,0.07)", border: "1px solid rgba(250,204,21,0.2)",
            }}>
              <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "5px" }}>
                Price
              </div>
              {hasPrice ? (
                <>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#facc15", lineHeight: 1.1 }}>{nft.price}</div>
                  <div style={{ fontSize: "10px", color: "rgba(250,204,21,0.6)", fontWeight: 600 }}>WIRE</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-muted)", lineHeight: 1.2 }}>—</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{nft.price}</div>
                </>
              )}
            </div>

            {/* AI Score */}
            <div style={{
              padding: "14px 16px", borderRadius: "12px",
              background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.18)",
            }}>
              <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "5px" }}>
                AI Score
              </div>
              {nft.uniquenessScore && nft.uniquenessScore > 0 ? (
                <>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--neon-green)", lineHeight: 1.1 }}>
                    {(nft.uniquenessScore / 100).toFixed(1)}
                  </div>
                  <div style={{ fontSize: "10px", color: "rgba(0,255,136,0.6)", fontWeight: 600 }}>/ 100.0</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-muted)", lineHeight: 1.1 }}>N/A</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Not scored</div>
                </>
              )}
            </div>

            {/* Network */}
            <div style={{
              padding: "14px 16px", borderRadius: "12px",
              background: "rgba(0,180,255,0.06)", border: "1px solid rgba(0,180,255,0.18)",
            }}>
              <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "5px" }}>
                Network
              </div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#00b4ff", lineHeight: 1.2 }}>WireFluid</div>
              <div style={{ fontSize: "10px", color: "rgba(0,180,255,0.6)" }}>Chain 92533</div>
            </div>
          </div>

          {/* ── Uniqueness bar ── */}
          {nft.uniquenessScore && nft.uniquenessScore > 0 && (
            <div style={{ marginBottom: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Uniqueness
                </span>
                <span style={{ fontSize: "10px", color: "var(--neon-green)", fontWeight: 700 }}>
                  {(nft.uniquenessScore / 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ height: "5px", borderRadius: "3px", background: "rgba(255,255,255,0.07)" }}>
                <div style={{
                  height: "100%", borderRadius: "3px",
                  width: `${Math.min(nft.uniquenessScore / 100, 100)}%`,
                  background: "linear-gradient(90deg, var(--neon-green) 0%, #00b4ff 100%)",
                  boxShadow: "0 0 8px rgba(0,255,136,0.4)",
                  transition: "width 0.8s ease",
                }} />
              </div>
            </div>
          )}

          {/* ── Step progress indicator ── */}
          {busy && step !== "success" && (
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "12px 16px", borderRadius: "10px", marginBottom: "14px",
              background: `rgba(0,0,0,0.3)`, border: "1px solid rgba(255,255,255,0.07)",
            }}>
              {/* Spinner */}
              <div style={{
                width: "16px", height: "16px", borderRadius: "50%",
                border: `2px solid ${color}30`,
                borderTopColor: color,
                animation: "mSpin 0.8s linear infinite",
                flexShrink: 0,
              }} />
              <span style={{ fontSize: "12px", color: "#a8c8e8", fontWeight: 500 }}>
                {STEP_LABEL[step]}
              </span>
            </div>
          )}

          {/* ── Error box ── */}
          {step === "error" && errMsg && (
            <div style={{
              padding: "12px 16px", borderRadius: "10px", marginBottom: "14px",
              background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.28)",
              fontSize: "12px", color: "#ff9090", lineHeight: 1.55,
            }}>
              {errMsg}
            </div>
          )}

          {/* ── Success box ── */}
          {step === "success" && (
            <div style={{
              padding: "18px", borderRadius: "14px", marginBottom: "16px",
              background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.32)",
              display: "flex", alignItems: "flex-start", gap: "14px",
            }}>
              <div style={{ fontSize: "28px", lineHeight: 1 }}>🎉</div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--neon-green)", marginBottom: "4px" }}>
                  Purchase Successful!
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6 }}>
                  You now own <strong style={{ color: "#e2f0ff" }}>{nft.title}</strong>
                </div>
                {txHash && (
                  <div style={{
                    marginTop: "8px", fontSize: "10px", fontFamily: "monospace",
                    color: "rgba(0,255,136,0.55)", letterSpacing: "0.04em",
                  }}>
                    Tx: {shortenHash(txHash)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CTA button ── */}
          {step !== "success" ? (
            <button
              onClick={step === "error" ? retry : handleBuy}
              disabled={busy}
              style={{
                width: "100%", padding: "16px",
                borderRadius: "13px",
                border: step === "error"
                  ? "1px solid rgba(255,80,80,0.5)"
                  : busy
                    ? `1px solid ${color}25`
                    : `1px solid ${color}60`,
                background: step === "error"
                  ? "linear-gradient(135deg, rgba(255,60,60,0.15), rgba(180,0,0,0.10))"
                  : busy
                    ? `linear-gradient(135deg, ${color}10, ${color}06)`
                    : `linear-gradient(135deg, ${color}22, ${color}10)`,
                color: step === "error" ? "#ff8888" : color,
                fontSize: "13px", fontWeight: 800, letterSpacing: "0.12em",
                textTransform: "uppercase", cursor: busy ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                boxShadow: !busy && step !== "error" ? `0 0 22px ${color}18` : "none",
                opacity: busy ? 0.7 : 1,
              }}
              onMouseEnter={e => {
                if (!busy && step !== "error") {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 30px ${color}30`;
                  (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(135deg, ${color}32, ${color}18)`;
                }
              }}
              onMouseLeave={e => {
                if (!busy && step !== "error") {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 22px ${color}18`;
                  (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(135deg, ${color}22, ${color}10)`;
                }
              }}
            >
              {busy
                ? STEP_LABEL[step]
                : step === "error"
                  ? "RETRY PURCHASE"
                  : hasPrice
                    ? `CONFIRM PURCHASE — ${nft.price} WIRE`
                    : "CONFIRM PURCHASE"}
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{
                width: "100%", padding: "14px", borderRadius: "13px",
                border: "1px solid rgba(0,255,136,0.35)",
                background: "rgba(0,255,136,0.07)",
                color: "var(--neon-green)", fontSize: "13px", fontWeight: 700,
                letterSpacing: "0.06em", cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,255,136,0.13)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,255,136,0.07)"; }}
            >
              Done
            </button>
          )}

          {/* Disclaimer */}
          {(step === "idle" || step === "error") && (
            <div style={{
              textAlign: "center", marginTop: "10px",
              fontSize: "10px", color: "rgba(107,140,174,0.4)", lineHeight: 1.5,
            }}>
              {nft.isReal
                ? `Sends ${hasPrice ? nft.price + " WIRE" : "WIRE"} to the Fankar Protocol treasury · Chain 92533`
                : "Demo listing — full on-chain trading coming soon"}
            </div>
          )}
        </div>
      </div>

      {/* ── Local keyframes ── */}
      <style>{`
        @keyframes mOverlayIn { from { opacity:0 } to { opacity:1 } }
        @keyframes mCardIn {
          from { opacity:0; transform:translate(-50%,-50%) scale(0.91); }
          to   { opacity:1; transform:translate(-50%,-50%) scale(1); }
        }
        @keyframes mSpin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}
