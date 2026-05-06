"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { CreateSensorForm } from "@/components/CreateSensorForm";
import { mintTokens } from "@/lib/createSensorToken";
import Link from "next/link";

const DUMMY_TXN_HASH =
  "5yofGT4WCDbtUcna345nPBjgCxzrLhWxQfxVesoTN8tcLPSt1ZZpBcnBLz4JRanK3SHGw5Xp4ESXcHyyYtVQbCcC";

type Sensor = {
  id: number;
  name: string;
  symbol: string;
  mint_address: string;
  signature: string;
  owner_address: string;
  created_at: string;
};

type MintStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; signature: string }
  | { type: "error"; message: string };

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function MintTokensForm({
  sensor,
  wallet,
}: {
  sensor: Sensor;
  wallet: ReturnType<typeof useWallets>["wallets"][number];
}) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<MintStatus>({ type: "idle" });

  const isLoading = status.type === "loading";
  const canSubmit =
    recipient.trim().length > 0 && Number(amount) > 0 && !isLoading;

  async function handleMint(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus({ type: "loading" });
    try {
      const result = await mintTokens(
        wallet,
        sensor.mint_address,
        recipient.trim(),
        Number(amount),
      );
      setStatus({ type: "success", signature: result.signature });
      setRecipient("");
      setAmount("");
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Transaction failed",
      });
    }
  }

  return (
    <div
      style={{
        marginTop: "20px",
        paddingTop: "20px",
        borderTop: "1px solid var(--border)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <p
        style={{
          fontSize: "10px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: "10px",
        }}
      >
        Mint to Sensor Wallet
      </p>
      <form onSubmit={handleMint}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            border: "1px solid var(--border)",
            background: "var(--bg)",
          }}
        >
          <div style={{ borderRight: "1px solid var(--border)" }}>
            <label
              style={{
                display: "block",
                fontSize: "9px",
                letterSpacing: "0.12em",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                padding: "6px 10px 2px",
              }}
            >
              Recipient
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Wallet address"
              disabled={isLoading}
              style={{
                display: "block",
                width: "100%",
                background: "none",
                border: "none",
                outline: "none",
                padding: "0 10px 6px",
                fontSize: "12px",
                color: "var(--text-primary)",
                fontFamily: "monospace",
              }}
            />
          </div>
          <div
            style={{
              borderRight: "1px solid var(--border)",
              minWidth: "80px",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: "9px",
                letterSpacing: "0.12em",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                padding: "6px 10px 2px",
              }}
            >
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              disabled={isLoading}
              style={{
                display: "block",
                width: "100%",
                background: "none",
                border: "none",
                outline: "none",
                padding: "0 10px 6px",
                fontSize: "12px",
                color: "var(--text-primary)",
                fontFamily: "inherit",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: "0 16px",
              background: canSubmit ? "var(--text-primary)" : "transparent",
              border: "none",
              color: canSubmit ? "var(--bg)" : "var(--text-muted)",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: canSubmit ? "pointer" : "default",
              transition: "background 0.15s, color 0.15s",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {isLoading ? "…" : "Mint →"}
          </button>
        </div>
      </form>

      {status.type === "success" && (
        <p
          style={{
            marginTop: "6px",
            fontSize: "10px",
            color: "var(--text-secondary)",
            wordBreak: "break-all",
          }}
        >
          Minted ·{" "}
          <a
            href={`https://explorer.solana.com/tx/${status.signature}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            Tx →
          </a>
        </p>
      )}

      {status.type === "error" && (
        <p style={{ marginTop: "6px", fontSize: "10px", color: "#c0392b" }}>
          {status.message}
        </p>
      )}
    </div>
  );
}

export default function Home() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const [sensors, setSensors] = useState<Sensor[]>([]);

  const walletAddress = user?.wallet?.address;
  const shortWallet = walletAddress ? shortAddress(walletAddress) : null;
  const connectedWallet = wallets[0];

  const fetchSensors = useCallback(async () => {
    try {
      const res = await fetch("/api/sensors");
      if (res.ok) {
        const data = await res.json();
        setSensors(data);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetch("/api/sensors")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSensors(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-8 py-5"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      >
        <div className="flex items-center gap-6">
          <span
            className="text-sm font-medium tracking-widest uppercase"
            style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
          >
            Sensors <span className="lowercase opacity-50">@tumbuh</span>
          </span>
          <nav className="ml-8 flex items-center gap-4">
            <Link
              href="/"
              className="text-xs tracking-widest uppercase"
              style={{
                color: "var(--text-muted)",
                letterSpacing: "0.12em",
                textDecoration: "none",
              }}
            >
              Sensor Registry
            </Link>
            <Link
              href="/providers"
              className="text-xs tracking-widest uppercase"
              style={{
                color: "var(--text-primary)",
                letterSpacing: "0.12em",
                textDecoration: "none",
                borderBottom: "1px solid var(--text-primary)",
                paddingBottom: "1px",
              }}
            >
              Sensor Provider Registry
            </Link>
          </nav>
        </div>
        <button
          disabled={!ready}
          onClick={authenticated ? logout : login}
          className="text-xs tracking-widest uppercase"
          style={{
            color: authenticated
              ? "var(--text-secondary)"
              : "var(--text-primary)",
            letterSpacing: "0.12em",
            background: "none",
            border: "none",
            cursor: ready ? "pointer" : "default",
            opacity: ready ? 1 : 0.4,
            padding: 0,
          }}
        >
          {!ready
            ? "—"
            : authenticated
              ? (shortWallet ?? "Disconnect")
              : "Connect"}
        </button>
      </header>

      {/* Hero */}
      <section className="px-8 pt-24 pb-8">
        <p
          className="text-xs tracking-widest uppercase mb-8"
          style={{ color: "var(--text-muted)", letterSpacing: "0.2em" }}
        >
          Sensor Provider Registry
        </p>
        <h1
          className="text-5xl font-light leading-tight"
          style={{
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Register as a sensor provider.
          <br />
          Mint the token your sensors run on.
        </h1>
        <ul
          className="mt-6 text-base flex flex-col gap-6"
          style={{
            color: "var(--text-secondary)",
            maxWidth: "800px",
            lineHeight: "1.7",
          }}
        >
          <li>
            Sensor providers register here by minting a Unit Token — the onchain
            currency their sensors use to report data. Each provider controls
            their own token and distributes it to their sensor wallets.
          </li>
          <li>
            When a sensor takes a reading, it burns Unit Tokens to record that
            data on Solana. As a provider, you are responsible for keeping your
            sensor wallets funded with enough tokens to operate.
          </li>
        </ul>
      </section>

      {/* Create Sensor Token Form */}
      {authenticated && <CreateSensorForm onCreated={fetchSensors} />}

      {/* Divider */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          marginLeft: "32px",
          marginRight: "32px",
        }}
      />

      {/* Listings */}
      <section className="px-8 pt-10 pb-24">
        <div className="flex items-center justify-between mb-8">
          <p
            className="text-xs tracking-widest uppercase"
            style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}
          >
            {sensors.length} Sensor Unit Tokens
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Mainnet
          </p>
        </div>

        {sensors.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No sensors yet.
          </p>
        ) : (
          <div
            className="grid gap-px"
            style={{
              gridTemplateColumns: "repeat(3, 1fr)",
              background: "var(--border)",
            }}
          >
            {sensors.map((s) => {
              const isOwner =
                authenticated &&
                walletAddress &&
                s.owner_address.toLowerCase() === walletAddress.toLowerCase();

              return (
                <div
                  key={s.id}
                  className="group"
                  style={{
                    background: "var(--bg-card)",
                    padding: "28px 24px",
                    transition: "background 0.15s",
                    cursor: isOwner ? "default" : "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#FFFFFF")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "var(--bg-card)")
                  }
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p
                        className="text-base font-medium mb-1"
                        style={{
                          color: "var(--text-primary)",
                          lineHeight: "1.4",
                        }}
                      >
                        {s.name}
                      </p>
                      <p
                        className="text-sm mb-6 font-mono"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {shortAddress(s.mint_address)}
                      </p>
                    </div>

                    <span
                      className="text-xs tracking-widest uppercase"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {s.symbol}
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p
                        className="text-xs mb-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Created
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {new Date(s.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <a
                      href={`https://explorer.solana.com/tx/${s.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        textDecoration: "none",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Tx →
                    </a>
                  </div>

                  {isOwner && connectedWallet && (
                    <MintTokensForm sensor={s} wallet={connectedWallet} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div className="px-8 py-6 flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Sensor Provider Registry
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Built on Solana
          </p>
        </div>
      </div>
    </div>
  );
}
