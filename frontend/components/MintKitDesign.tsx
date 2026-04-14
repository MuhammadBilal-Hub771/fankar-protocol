"use client";

/**
 * MintKitDesign.tsx
 * ──────────────────
 * Fankar Protocol — Kit Design Minting Component
 *
 * Full pipeline:
 *  1. Connect MetaMask wallet
 *  2. POST file + metadata to FastAPI AI Gatekeeper
 *  3. Receive IPFS token_uri + ECDSA signature from AI
 *  4. Call FankarNFT.mintFankarAsset() via ethers.js on WireFluid
 */

import { useState, useRef, useCallback, type ChangeEvent } from "react";
import { ethers } from "ethers";
import FankarNFTAbi from "./FankarNFT.json";

// ── Constants ───────────────────────────────────────────────
const API_BASE_URL     = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
const AI_API_URL       = `${API_BASE_URL}/api/v1/mint-asset`;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const WIREFLUID_CHAIN_ID = 92533;
const ZERO_ADDRESS    = "0x0000000000000000000000000000000000000000";

// ── Types ────────────────────────────────────────────────────
type MintStep =
  | "idle"
  | "connecting"
  | "analyzing"
  | "waiting_confirm"
  | "minting"
  | "success"
  | "error";

interface AiApiResponse {
  token_uri:        string;
  signature:        string;
  // nonce is a STRING from the API — never a JS number.
  // secrets.randbits(64) can exceed Number.MAX_SAFE_INTEGER (2^53).
  // If it were returned as a JSON number, JSON.parse() would silently round
  // it and BigInt() would produce the wrong value → InvalidSignature.
  // Keeping it a string lets BigInt("...") decode it with full 64-bit precision.
  nonce:            string;
  uniqueness_score: number;
  bowling_speed:    number;
  confidence:       number;
  ai_verdict:       string;
  image_url:        string;
  metadata_cid:     string;
  // Resolved checksum addresses used when building the signature hash.
  // These MUST be forwarded verbatim to mintFankarAsset() — any other
  // value produces a different on-chain hash → InvalidSignature revert.
  creator_address:  string;
  brand_address:    string;
}

interface MintResult {
  tokenId:  string;
  txHash:   string;
  tokenUri: string;
  aiData:   AiApiResponse;
}

// ── Extend window for MetaMask ────────────────────────────────
declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

// ── Step labels shown in the progress bar ────────────────────
const STEPS: { key: MintStep; label: string; icon: string }[] = [
  { key: "connecting",      label: "Connect Wallet",    icon: "🔗" },
  { key: "analyzing",       label: "AI Analysis",       icon: "🤖" },
  { key: "waiting_confirm", label: "Confirm in Wallet", icon: "✍️" },
  { key: "minting",         label: "Minting on-chain",  icon: "⛓️" },
  { key: "success",         label: "Minted!",           icon: "✅" },
];

const STEP_INDEX: Partial<Record<MintStep, number>> = {
  connecting:      0,
  analyzing:       1,
  waiting_confirm: 2,
  minting:         3,
  success:         4,
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function MintKitDesign() {
  // ── Form state ─────────────────────────────────────────────
  const [file,        setFile]        = useState<File | null>(null);
  const [preview,     setPreview]     = useState<string | null>(null);
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");

  // ── Mint flow state ────────────────────────────────────────
  const [step,        setStep]        = useState<MintStep>("idle");
  const [statusMsg,   setStatusMsg]   = useState("");
  const [error,       setError]       = useState<string | null>(null);
  const [result,      setResult]      = useState<MintResult | null>(null);
  const [walletAddr,  setWalletAddr]  = useState<string | null>(null);
  const [aiData,      setAiData]      = useState<AiApiResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File selection ──────────────────────────────────────────
  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    setFile(dropped);
    setPreview(URL.createObjectURL(dropped));
    setError(null);
  }, []);

  // ── Reset ───────────────────────────────────────────────────
  const reset = () => {
    setFile(null);
    setPreview(null);
    setName("");
    setDescription("");
    setStep("idle");
    setStatusMsg("");
    setError(null);
    setResult(null);
    setAiData(null);
  };

  // ─────────────────────────────────────────────────────────
  // MAIN MINT FLOW
  // ─────────────────────────────────────────────────────────
  const handleMint = async () => {
    setError(null);

    // ── Validation ──────────────────────────────────────────
    if (!file)        return setError("Please upload an image file.");
    if (!name.trim()) return setError("Please enter a name for your asset.");
    if (!description.trim()) return setError("Please enter a description.");
    if (!CONTRACT_ADDRESS) return setError("Contract address is not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS.");

    try {
      // ────────────────────────────────────────────────────
      // STEP 1 — Connect MetaMask wallet
      // ────────────────────────────────────────────────────
      setStep("connecting");
      setStatusMsg("Connecting to MetaMask...");

      if (!window.ethereum) {
        throw new Error("MetaMask is not installed. Please install it from metamask.io.");
      }

      // Request account access
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please unlock MetaMask.");
      }

      const minterAddress = ethers.getAddress(accounts[0]);
      setWalletAddr(minterAddress);

      // Switch / verify network is WireFluid (chain 92533)
      const chainHex = `0x${WIREFLUID_CHAIN_ID.toString(16)}`;
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainHex }],
        });
      } catch (switchErr: unknown) {
        // Error code 4902 = chain not added yet — add it automatically
        if ((switchErr as { code?: number }).code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: chainHex,
                chainName: "WireFluid",
                nativeCurrency: { name: "WIRE", symbol: "WIRE", decimals: 18 },
                rpcUrls: ["https://evm.wirefluid.com"],
                blockExplorerUrls: ["https://explorer.wirefluid.com"],
              },
            ],
          });
        } else {
          throw new Error("Please switch your MetaMask network to WireFluid (Chain ID 92533).");
        }
      }

      setStatusMsg(`Wallet connected: ${minterAddress.slice(0, 6)}…${minterAddress.slice(-4)}`);

      // ────────────────────────────────────────────────────
      // STEP 2 — Send file to AI Gatekeeper API
      // ────────────────────────────────────────────────────
      setStep("analyzing");
      setStatusMsg("Uploading to AI — analysing originality & scores...");

      const formData = new FormData();
      formData.append("file",             file);
      formData.append("name",             name.trim());
      formData.append("description",      description.trim());
      formData.append("feature_type",     "kit_design");
      formData.append("minter_address",   minterAddress);
      // creator = minter's own wallet (self-mint — 70 % royalty goes to self).
      // brand   = minter's own wallet (self-mint — 15 % royalty also goes to self).
      // The contract rejects address(0) for both creator AND brand (ZeroAddress error),
      // so we must always pass a real wallet.  The backend signs with these exact
      // checksummed addresses and returns them in apiData.creator_address /
      // apiData.brand_address — the contract call below MUST use those exact values.
      formData.append("creator_address",  minterAddress);
      formData.append("brand_address",    minterAddress);
      formData.append("mint_fee",         "0");

      console.log("[MintKitDesign] POST →", AI_API_URL);
      const apiResponse = await fetch(AI_API_URL, {
        method: "POST",
        body:   formData,
      });

      if (!apiResponse.ok) {
        const errData = await apiResponse.json().catch(() => ({ detail: "Unknown AI error" }));
        throw new Error(`AI Gatekeeper rejected asset: ${errData.detail ?? apiResponse.statusText}`);
      }

      const apiData: AiApiResponse = await apiResponse.json();
      setAiData(apiData);

      // Sanitise the signature: ethers.js requires a 0x-prefixed hex string
      // for `bytes` arguments. The backend should already add the prefix, but
      // this guard ensures correctness even if the raw hex arrives without it.
      const formattedSignature = apiData.signature.startsWith("0x")
        ? apiData.signature
        : `0x${apiData.signature}`;

      setStatusMsg(
        `AI approved ✓  Uniqueness: ${(apiData.uniqueness_score / 100).toFixed(1)}%  |  ` +
        (apiData.bowling_speed > 0
          ? `Speed: ${(apiData.bowling_speed / 100).toFixed(1)} km/h`
          : "Non-sports asset")
      );

      // ────────────────────────────────────────────────────
      // STEP 3 — Call smart contract via ethers.js
      // ────────────────────────────────────────────────────
      setStep("waiting_confirm");
      setStatusMsg("Please confirm the transaction in MetaMask...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        FankarNFTAbi,
        signer,
      );

      // mintFankarAsset(creator, brand, uri, mintFee, bowlingSpeed, uniquenessScore, nonce, sig)
      //
      // RULE: always use apiData.creator_address and apiData.brand_address.
      // The backend checksums these addresses before hashing (EIP-55), so the
      // values returned in the API response are the EXACT bytes that were signed.
      // Using any other value produces a different hash → InvalidSignature revert.
      // The contract also rejects address(0) for creator/brand → ZeroAddress revert.
      const tx = await contract.mintFankarAsset(
        apiData.creator_address,   // minterAddress (checksummed)
        apiData.brand_address,     // ZERO_ADDRESS  (0x000...000)
        apiData.token_uri,
        BigInt(0),                 // mintFee — free mint
        BigInt(apiData.bowling_speed),
        BigInt(apiData.uniqueness_score),
        BigInt(apiData.nonce),
        formattedSignature,
        { value: BigInt(0) },
      );

      setStep("minting");
      setStatusMsg(`Transaction submitted — waiting for WireFluid confirmation...  Tx: ${tx.hash.slice(0, 10)}…`);

      const receipt = await tx.wait(1);

      if (receipt.status === 0) {
        throw new Error("Transaction was reverted on-chain. Check contract state.");
      }

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
      } catch {
        // Non-critical — token ID display only
      }

      setResult({
        tokenId:  mintedTokenId,
        txHash:   receipt.hash,
        tokenUri: apiData.token_uri,
        aiData:   apiData,
      });
      setStep("success");
      setStatusMsg("Your Fankar Protocol NFT has been minted on WireFluid! 🎉");

    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred.";
      setError(message);
      setStep("error");
      setStatusMsg("");
    }
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  const currentStepIndex = STEP_INDEX[step] ?? -1;
  const isProcessing     = !["idle", "success", "error"].includes(step);

  return (
    <div
      style={{
        maxWidth: "680px",
        margin: "0 auto",
        animation: "fadeInUp 0.5s ease forwards",
      }}
    >
      {/* ── Page title ── */}
      <div style={{ marginBottom: "28px" }}>
        <span
          style={{
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--neon-green)",
            textShadow: "0 0 10px rgba(0,255,136,0.5)",
          }}
        >
          ◆ Kit Design
        </span>
        <h2
          style={{
            fontSize: "26px",
            fontWeight: 800,
            color: "#e2f0ff",
            margin: "6px 0 4px",
            letterSpacing: "-0.02em",
          }}
        >
          Mint Your Kit Asset
        </h2>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
          Upload your kit design — our AI will analyse it and mint it as an NFT on WireFluid.
        </p>
      </div>

      {/* ── Progress Steps ── */}
      {step !== "idle" && (
        <div
          style={{
            display: "flex",
            gap: "6px",
            marginBottom: "24px",
            padding: "16px 20px",
            background: "rgba(13,31,53,0.8)",
            borderRadius: "12px",
            border: "1px solid rgba(0,255,136,0.1)",
            overflowX: "auto",
          }}
        >
          {STEPS.map((s, idx) => {
            const done    = idx < currentStepIndex;
            const active  = idx === currentStepIndex;
            const pending = idx > currentStepIndex;
            return (
              <div
                key={s.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    background: done
                      ? "rgba(0,255,136,0.2)"
                      : active
                      ? "rgba(0,255,136,0.15)"
                      : "rgba(255,255,255,0.04)",
                    border: done
                      ? "1px solid rgba(0,255,136,0.5)"
                      : active
                      ? "1px solid rgba(0,255,136,0.8)"
                      : "1px solid rgba(255,255,255,0.1)",
                    boxShadow: active
                      ? "0 0 10px rgba(0,255,136,0.4)"
                      : "none",
                    transition: "all 0.3s ease",
                    animation: active ? "pulseGreen 1.5s ease-in-out infinite" : "none",
                  }}
                >
                  {done ? "✓" : s.icon}
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    color: done
                      ? "var(--neon-green)"
                      : active
                      ? "#e2f0ff"
                      : "var(--text-muted)",
                    fontWeight: active ? 600 : 400,
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.label}
                </span>
                {idx < STEPS.length - 1 && (
                  <span
                    style={{
                      fontSize: "10px",
                      color: done ? "rgba(0,255,136,0.4)" : "rgba(255,255,255,0.1)",
                      margin: "0 2px",
                    }}
                  >
                    ───
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Status message ── */}
      {statusMsg && (
        <div
          style={{
            padding: "12px 16px",
            marginBottom: "20px",
            borderRadius: "10px",
            background: "rgba(0,255,136,0.06)",
            border: "1px solid rgba(0,255,136,0.2)",
            fontSize: "13px",
            color: "#a8e8c8",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {isProcessing && (
            <span
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                border: "2px solid rgba(0,255,136,0.3)",
                borderTop: "2px solid var(--neon-green)",
                display: "inline-block",
                animation: "spin 0.8s linear infinite",
                flexShrink: 0,
              }}
            />
          )}
          {statusMsg}
        </div>
      )}

      {/* ── Error message ── */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            marginBottom: "20px",
            borderRadius: "10px",
            background: "rgba(255,60,60,0.08)",
            border: "1px solid rgba(255,60,60,0.3)",
            fontSize: "13px",
            color: "#ff8080",
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
          }}
        >
          <span style={{ flexShrink: 0, marginTop: "1px" }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── SUCCESS CARD ── */}
      {step === "success" && result && (
        <div
          style={{
            marginBottom: "24px",
            padding: "24px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, rgba(0,255,136,0.1) 0%, rgba(0,180,255,0.06) 100%)",
            border: "1px solid rgba(0,255,136,0.35)",
            boxShadow: "0 0 30px rgba(0,255,136,0.15)",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--neon-green)",
              marginBottom: "16px",
            }}
          >
            ✅ NFT Minted Successfully!
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {[
              { label: "Token ID",        value: `#${result.tokenId}` },
              { label: "Uniqueness Score", value: `${(result.aiData.uniqueness_score / 100).toFixed(1)}%` },
              { label: "Confidence",      value: `${(result.aiData.confidence * 100).toFixed(1)}%` },
              { label: "Bowling Speed",   value: result.aiData.bowling_speed > 0 ? `${(result.aiData.bowling_speed / 100).toFixed(1)} km/h` : "N/A" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  background: "rgba(0,255,136,0.05)",
                  border: "1px solid rgba(0,255,136,0.12)",
                }}
              >
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#e2f0ff" }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "14px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontSize: "11px",
              fontFamily: "monospace",
              color: "var(--text-muted)",
              wordBreak: "break-all",
            }}
          >
            <span style={{ color: "var(--neon-green)", marginRight: "6px" }}>Tx:</span>
            <a
              href={`https://explorer.wirefluid.com/tx/${result.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#00b4ff", textDecoration: "none" }}
            >
              {result.txHash.slice(0, 20)}…{result.txHash.slice(-8)}
            </a>
          </div>

          <button
            onClick={reset}
            style={{
              marginTop: "16px",
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              background: "rgba(0,255,136,0.08)",
              border: "1px solid rgba(0,255,136,0.25)",
              color: "var(--neon-green)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            Mint Another Asset
          </button>
        </div>
      )}

      {/* ── FORM ── */}
      {step !== "success" && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(13,31,53,0.9) 0%, rgba(10,22,40,0.9) 100%)",
            border: "1px solid rgba(0,255,136,0.1)",
            borderRadius: "16px",
            padding: "28px",
          }}
        >
          {/* Image Upload Area */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "10px",
              }}
            >
              Kit Design Image
            </label>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${preview ? "rgba(0,255,136,0.4)" : "rgba(0,255,136,0.15)"}`,
                borderRadius: "12px",
                padding: "8px",
                cursor: isProcessing ? "not-allowed" : "pointer",
                transition: "border-color 0.2s ease",
                overflow: "hidden",
                minHeight: preview ? "auto" : "160px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,255,136,0.02)",
                position: "relative",
              }}
            >
              {preview ? (
                <div style={{ width: "100%", position: "relative" }}>
                  <img
                    src={preview}
                    alt="Kit preview"
                    style={{
                      width: "100%",
                      maxHeight: "260px",
                      objectFit: "contain",
                      borderRadius: "8px",
                    }}
                  />
                  {!isProcessing && (
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        background: "rgba(0,0,0,0.7)",
                        border: "1px solid rgba(0,255,136,0.3)",
                        borderRadius: "6px",
                        padding: "4px 10px",
                        fontSize: "11px",
                        color: "var(--neon-green)",
                      }}
                    >
                      Click to change
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <div style={{ fontSize: "36px", marginBottom: "10px" }}>🎨</div>
                  <div style={{ fontSize: "13px", color: "#a8c8e8", marginBottom: "4px" }}>
                    Drag & drop or click to upload
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    PNG, JPG, GIF, WebP — max 10 MB
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isProcessing}
              style={{ display: "none" }}
            />

            {file && (
              <div
                style={{
                  marginTop: "6px",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontFamily: "monospace",
                }}
              >
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </div>
            )}
          </div>

          {/* Name Input */}
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="asset-name"
              style={{
                display: "block",
                fontSize: "12px",
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Asset Name
            </label>
            <input
              id="asset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isProcessing}
              placeholder="e.g. Lahore Qalandars Kit 2026"
              style={{
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
                opacity: isProcessing ? 0.5 : 1,
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(0,255,136,0.5)")}
              onBlur={(e)  => (e.target.style.borderColor = "rgba(0,255,136,0.15)")}
            />
          </div>

          {/* Description Input */}
          <div style={{ marginBottom: "24px" }}>
            <label
              htmlFor="asset-desc"
              style={{
                display: "block",
                fontSize: "12px",
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Description
            </label>
            <textarea
              id="asset-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isProcessing}
              rows={3}
              placeholder="Describe the kit design, season, and franchise..."
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "9px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(0,255,136,0.15)",
                color: "#e2f0ff",
                fontSize: "14px",
                outline: "none",
                resize: "vertical",
                transition: "border-color 0.2s ease",
                boxSizing: "border-box",
                fontFamily: "inherit",
                opacity: isProcessing ? 0.5 : 1,
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(0,255,136,0.5)")}
              onBlur={(e)  => (e.target.style.borderColor = "rgba(0,255,136,0.15)")}
            />
          </div>

          {/* Wallet address pill (if connected) */}
          {walletAddr && (
            <div
              style={{
                marginBottom: "16px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: "rgba(0,255,136,0.06)",
                border: "1px solid rgba(0,255,136,0.15)",
                fontSize: "12px",
                color: "var(--text-muted)",
                fontFamily: "monospace",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "var(--neon-green)",
                  boxShadow: "0 0 6px var(--neon-green)",
                  flexShrink: 0,
                  animation: "pulseGreen 2s ease-in-out infinite",
                }}
              />
              {walletAddr}
            </div>
          )}

          {/* AI score preview (shown after analysis, before tx) */}
          {aiData && step === "waiting_confirm" && (
            <div
              style={{
                marginBottom: "16px",
                padding: "14px",
                borderRadius: "10px",
                background: "rgba(0,180,255,0.06)",
                border: "1px solid rgba(0,180,255,0.2)",
              }}
            >
              <div style={{ fontSize: "11px", color: "#00b4ff", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
                🤖 AI Analysis Complete
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Uniqueness </span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--neon-green)" }}>
                    {(aiData.uniqueness_score / 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Confidence </span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#a8c8e8" }}>
                    {(aiData.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", alignSelf: "center" }}>
                  {aiData.ai_verdict}
                </div>
              </div>
            </div>
          )}

          {/* Mint Button */}
          <button
            onClick={handleMint}
            disabled={isProcessing}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: "12px",
              background: isProcessing
                ? "rgba(0,255,136,0.08)"
                : "linear-gradient(135deg, rgba(0,255,136,0.2) 0%, rgba(0,180,255,0.15) 100%)",
              border: `1px solid ${isProcessing ? "rgba(0,255,136,0.2)" : "rgba(0,255,136,0.5)"}`,
              color: isProcessing ? "rgba(0,255,136,0.5)" : "var(--neon-green)",
              fontSize: "15px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: isProcessing ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: isProcessing ? "none" : "0 0 20px rgba(0,255,136,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
            }}
            onMouseEnter={(e) => {
              if (!isProcessing) {
                (e.currentTarget).style.boxShadow = "0 0 35px rgba(0,255,136,0.35)";
                (e.currentTarget).style.background = "linear-gradient(135deg, rgba(0,255,136,0.28) 0%, rgba(0,180,255,0.22) 100%)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isProcessing) {
                (e.currentTarget).style.boxShadow = "0 0 20px rgba(0,255,136,0.15)";
                (e.currentTarget).style.background = "linear-gradient(135deg, rgba(0,255,136,0.2) 0%, rgba(0,180,255,0.15) 100%)";
              }
            }}
          >
            {isProcessing ? (
              <>
                <span
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    border: "2px solid rgba(0,255,136,0.2)",
                    borderTop: "2px solid rgba(0,255,136,0.6)",
                    animation: "spin 0.8s linear infinite",
                    flexShrink: 0,
                  }}
                />
                {step === "connecting"      && "Connecting Wallet..."}
                {step === "analyzing"       && "Analyzing with AI..."}
                {step === "waiting_confirm" && "Confirm in MetaMask..."}
                {step === "minting"         && "Minting on WireFluid..."}
              </>
            ) : (
              <>⬡ Mint Fankar Asset</>
            )}
          </button>

          {/* Info note */}
          <p
            style={{
              marginTop: "12px",
              textAlign: "center",
              fontSize: "11px",
              color: "var(--text-muted)",
              lineHeight: 1.5,
            }}
          >
            Asset is analysed by our AI before minting. Requires MetaMask on WireFluid (Chain ID: 92533).
          </p>
        </div>
      )}

      {/* Spinner keyframe */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
