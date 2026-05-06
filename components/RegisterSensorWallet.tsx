"use client";

import { useState, useEffect } from "react";

type SensorToken = {
  id: number;
  name: string;
  symbol: string;
  mint_address: string;
};

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; walletAddress: string }
  | { type: "error"; message: string };

interface Props {
  onRegistered?: () => void;
}

function isValidSolanaAddress(addr: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}

export function RegisterSensorWallet({ onRegistered }: Props) {
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedMint, setSelectedMint] = useState("");
  const [sensorTokens, setSensorTokens] = useState<SensorToken[]>([]);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  useEffect(() => {
    fetch("/api/sensors")
      .then((res) => (res.ok ? res.json() : []))
      .then(setSensorTokens)
      .catch(() => {});
  }, []);

  const selectedToken = sensorTokens.find((t) => t.mint_address === selectedMint);
  const isLoading = status.type === "loading";
  const canSubmit =
    isValidSolanaAddress(walletAddress.trim()) &&
    selectedMint.length > 0 &&
    !isLoading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedToken) return;

    setStatus({ type: "loading" });
    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: walletAddress.trim(),
          unitSymbol: selectedToken.symbol,
          mintAddress: selectedToken.mint_address,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Registration failed");
      }

      setStatus({ type: "success", walletAddress: walletAddress.trim() });
      setWalletAddress("");
      setSelectedMint("");
      onRegistered?.();
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Registration failed",
      });
    }
  }

  return (
    <section className="px-8 pt-0 pb-16">
      <p
        className="text-xs tracking-widest uppercase mb-4"
        style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}
      >
        Register Sensor Wallet
      </p>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: "0",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            maxWidth: "640px",
          }}
        >
          <div style={{ borderRight: "1px solid var(--border)" }}>
            <label
              style={{
                display: "block",
                fontSize: "10px",
                letterSpacing: "0.15em",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                padding: "10px 16px 4px",
              }}
            >
              Wallet Address
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Solana wallet address"
              disabled={isLoading}
              style={{
                display: "block",
                width: "100%",
                background: "none",
                border: "none",
                outline: "none",
                padding: "0 16px 10px",
                fontSize: "14px",
                color: "var(--text-primary)",
                fontFamily: "monospace",
              }}
            />
          </div>

          <div
            style={{
              borderRight: "1px solid var(--border)",
              minWidth: "160px",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: "10px",
                letterSpacing: "0.15em",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                padding: "10px 16px 4px",
              }}
            >
              Unit Token
            </label>
            <select
              value={selectedMint}
              onChange={(e) => setSelectedMint(e.target.value)}
              disabled={isLoading || sensorTokens.length === 0}
              style={{
                display: "block",
                width: "100%",
                background: "none",
                border: "none",
                outline: "none",
                padding: "0 16px 10px",
                fontSize: "14px",
                color: selectedMint ? "var(--text-primary)" : "var(--text-muted)",
                fontFamily: "inherit",
                cursor: "pointer",
                appearance: "none",
              }}
            >
              <option value="" disabled>
                {sensorTokens.length === 0 ? "No tokens yet" : "Select"}
              </option>
              {sensorTokens.map((t) => (
                <option key={t.mint_address} value={t.mint_address}>
                  {t.symbol} — {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: "0 24px",
              background: canSubmit ? "var(--text-primary)" : "transparent",
              border: "none",
              color: canSubmit ? "var(--bg)" : "var(--text-muted)",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: canSubmit ? "pointer" : "default",
              transition: "background 0.15s, color 0.15s",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {isLoading ? "Registering…" : "Register →"}
          </button>
        </div>
      </form>

      {status.type === "success" && (
        <div
          style={{
            marginTop: "20px",
            maxWidth: "640px",
            padding: "16px",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: "8px",
            }}
          >
            Wallet Registered
          </p>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-primary)",
              wordBreak: "break-all",
            }}
          >
            {status.walletAddress}
          </p>
        </div>
      )}

      {status.type === "error" && (
        <p
          style={{
            marginTop: "12px",
            fontSize: "12px",
            color: "#c0392b",
            maxWidth: "640px",
          }}
        >
          {status.message}
        </p>
      )}
    </section>
  );
}
