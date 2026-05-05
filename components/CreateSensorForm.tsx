"use client";

import { useState, useRef } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import { createSensorToken, TOKEN_DECIMALS } from "@/lib/createSensorToken";

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; mintAddress: string; signature: string }
  | { type: "error"; message: string };

export function CreateSensorForm() {
  const { wallets } = useWallets();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const formRef = useRef<HTMLFormElement>(null);

  const wallet = wallets[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet || !name.trim() || !unit.trim()) return;

    setStatus({ type: "loading" });
    try {
      const result = await createSensorToken(wallet);
      setStatus({ type: "success", ...result });
      setName("");
      setUnit("");
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Transaction failed",
      });
    }
  }

  function handleUnitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setUnit(raw);
  }

  function handleUnitKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Force uppercase by preventing lowercase and symbols
    const allowed = /^[A-Z0-9]$/;
    if (
      e.key.length === 1 &&
      !allowed.test(e.key.toUpperCase()) &&
      !e.metaKey &&
      !e.ctrlKey
    ) {
      e.preventDefault();
    }
  }

  const isLoading = status.type === "loading";
  const canSubmit = !!wallet && name.trim().length > 0 && unit.trim().length > 0 && !isLoading;

  return (
    <section className="px-8 pt-10 pb-16">
      <p
        className="text-xs tracking-widest uppercase mb-8"
        style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}
      >
        Create Sensor Token
      </p>

      <form ref={formRef} onSubmit={handleSubmit}>
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
          {/* Sensor Name */}
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
              Sensor Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Urban Air Quality Node"
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
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Unit Symbol */}
          <div
            style={{
              borderRight: "1px solid var(--border)",
              minWidth: "100px",
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
              Unit
            </label>
            <input
              type="text"
              value={unit}
              onChange={handleUnitChange}
              onKeyDown={handleUnitKeyDown}
              placeholder="PPM"
              maxLength={6}
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
                fontFamily: "inherit",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.05em",
              }}
            />
          </div>

          {/* Submit */}
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
            {isLoading ? "Creating…" : "Create →"}
          </button>
        </div>

        {/* Decimals hint */}
        <p
          style={{
            marginTop: "8px",
            fontSize: "11px",
            color: "var(--text-muted)",
          }}
        >
          {TOKEN_DECIMALS} decimals · infinite supply · creator-controlled
        </p>
      </form>

      {/* Status */}
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
            Token Created
          </p>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-primary)",
              wordBreak: "break-all",
              marginBottom: "4px",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>Mint: </span>
            {status.mintAddress}
          </p>
          <p
            style={{
              fontSize: "11px",
              color: "var(--text-secondary)",
              wordBreak: "break-all",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>Tx: </span>
            {status.signature}
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
