"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { RegisterSensorWallet } from "@/components/RegisterSensorWallet";
import { burnTokens } from "@/lib/createSensorToken";
import Link from "next/link";

type SensorWallet = {
  id: number;
  wallet_address: string;
  unit_symbol: string;
  mint_address: string;
  registered_at: string;
};

type BurnStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; signature: string }
  | { type: "error"; message: string };

type BurnTx = {
  signature: string;
  block_time: number;
  fee: number;
  burned: number | null;
};

type TrackDialogProps = {
  sensorWallet: SensorWallet;
  onClose: () => void;
};

function TrackDialog({ sensorWallet, onClose }: TrackDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [txs, setTxs] = useState<BurnTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  type RawTx = {
    block_time: number;
    raw_transaction: {
      meta: {
        fee?: number;
        logMessages?: string[];
        preTokenBalances?: Array<{ mint: string }>;
        postTokenBalances?: Array<{
          mint: string;
          uiTokenAmount: { uiAmount: number | null };
        }>;
      };
      transaction: { message: { accountKeys: string[] }; signatures: string[] };
    };
  };

  function extractBurns(transactions: RawTx[]): BurnTx[] {
    return transactions
      .filter((t) => {
        const logs = t.raw_transaction.meta.logMessages ?? [];
        const isBurn = logs.some((l) => l.includes("Instruction: Burn"));
        const mintMatch = [
          ...(t.raw_transaction.meta.preTokenBalances ?? []),
          ...(t.raw_transaction.meta.postTokenBalances ?? []),
        ].some((b) => b.mint === sensorWallet.mint_address);
        return isBurn && mintMatch;
      })
      .map((t) => {
        const pre = t.raw_transaction.meta.preTokenBalances?.find(
          (b) => b.mint === sensorWallet.mint_address,
        );
        const post = t.raw_transaction.meta.postTokenBalances?.find(
          (b) => b.mint === sensorWallet.mint_address,
        );
        const preAmt =
          (pre as { uiTokenAmount?: { uiAmount: number | null } }).uiTokenAmount
            ?.uiAmount ?? 0;
        const postAmt = post?.uiTokenAmount.uiAmount ?? 0;
        const burned = pre && post ? preAmt - postAmt : null;
        return {
          signature: t.raw_transaction.transaction.signatures[0] ?? "",
          block_time: t.block_time ?? 0,
          fee: t.raw_transaction.meta.fee ?? 0,
          burned,
        };
      });
  }

  async function fetchTxs(offset?: string) {
    const url = new URL("/api/transactions", window.location.origin);
    url.searchParams.set("address", sensorWallet.wallet_address);
    url.searchParams.set("limit", "20");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json() as Promise<{
      next_offset?: string;
      transactions: RawTx[];
    }>;
  }

  useEffect(() => {
    fetchTxs()
      .then((data) => {
        console.log("data", data);
        setTxs(extractBurns(data.transactions));
        setNextOffset(data.next_offset ?? null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to fetch"),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorWallet.wallet_address]);

  async function handleLoadMore() {
    if (!nextOffset) return;
    setLoadingMore(true);
    try {
      const data = await fetchTxs(nextOffset);
      setTxs((prev) => [...prev, ...extractBurns(data.transactions)]);
      setNextOffset(data.next_offset ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          width: "min(640px, 94vw)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "10px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: "4px",
              }}
            >
              Burn Transactions · {sensorWallet.unit_symbol}
            </p>
            <p
              style={{
                fontSize: "12px",
                fontFamily: "monospace",
                color: "var(--text-secondary)",
              }}
            >
              {sensorWallet.wallet_address}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "18px",
              lineHeight: 1,
              padding: "0 0 0 16px",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "0" }}>
          {loading && (
            <p
              style={{
                padding: "32px 24px",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              Loading…
            </p>
          )}
          {error && (
            <p
              style={{
                padding: "32px 24px",
                fontSize: "12px",
                color: "#c0392b",
              }}
            >
              {error}
            </p>
          )}
          {!loading && !error && txs.length === 0 && (
            <p
              style={{
                padding: "32px 24px",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              No burn transactions found.
            </p>
          )}
          {txs.map((tx, i) => (
            <div
              key={tx.signature || i}
              style={{
                padding: "14px 24px",
                borderBottom: "1px solid var(--border)",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "11px",
                    fontFamily: "monospace",
                    color: "var(--text-primary)",
                    marginBottom: "3px",
                    wordBreak: "break-all",
                  }}
                >
                  (
                  {tx.block_time
                    ? new Date(tx.block_time / 1000).toLocaleString()
                    : "—"}
                  ){" "}
                  {tx.burned != null
                    ? `${tx.burned * 100}% ${sensorWallet.unit_symbol}`
                    : ""}
                </p>
                <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                  {shortAddress(tx.signature)}
                </p>
              </div>
              <a
                href={`https://explorer.solana.com/tx/${tx.signature}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                View →
              </a>
            </div>
          ))}
        </div>

        {/* Load more */}
        {nextOffset && !loading && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                color: loadingMore
                  ? "var(--text-muted)"
                  : "var(--text-primary)",
                fontSize: "10px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "8px 16px",
                cursor: loadingMore ? "default" : "pointer",
                fontFamily: "inherit",
                width: "100%",
              }}
            >
              {loadingMore ? "Loading…" : "Load More"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function BurnForm({ sensorWallet }: { sensorWallet: SensorWallet }) {
  const { wallets } = useWallets();
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<BurnStatus>({ type: "idle" });

  const wallet = wallets[0];
  const isLoading = status.type === "loading";
  const canSubmit = Number(amount) > 0 && !isLoading && !!wallet;

  async function handleBurn(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !wallet) return;
    setStatus({ type: "loading" });
    try {
      const result = await burnTokens(
        wallet,
        sensorWallet.mint_address,
        Number(amount),
      );
      setStatus({ type: "success", signature: result.signature });
      setAmount("");
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Burn failed",
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
        Burn Tokens
      </p>
      <form onSubmit={handleBurn}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
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
              Amount ({sensorWallet.unit_symbol})
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
              background: canSubmit ? "#c0392b" : "transparent",
              border: "none",
              color: canSubmit ? "#fff" : "var(--text-muted)",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: canSubmit ? "pointer" : "default",
              transition: "background 0.15s, color 0.15s",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {isLoading ? "…" : "Burn"}
          </button>
        </div>
      </form>

      {status.type === "success" && (
        <p
          style={{
            marginTop: "6px",
            fontSize: "10px",
            color: "var(--text-secondary)",
          }}
        >
          Burned ·{" "}
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

export default function MarketplacePage() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const [sensorWallets, setSensorWallets] = useState<SensorWallet[]>([]);
  const [trackingSensor, setTrackingSensor] = useState<SensorWallet | null>(
    null,
  );

  const walletAddress = user?.wallet?.address;
  const shortWallet = walletAddress ? shortAddress(walletAddress) : null;

  const fetchWallets = useCallback(async () => {
    try {
      const res = await fetch("/api/wallets");
      if (res.ok) {
        const data = await res.json();
        setSensorWallets(data);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWallets();
  }, [fetchWallets]);

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
                color: "var(--text-primary)",
                letterSpacing: "0.12em",
                textDecoration: "none",
                borderBottom: "1px solid var(--text-primary)",
                paddingBottom: "1px",
              }}
            >
              Marketplace
            </Link>
            <Link
              href="/providers"
              className="text-xs tracking-widest uppercase"
              style={{
                color: "var(--text-muted)",
                letterSpacing: "0.12em",
                textDecoration: "none",
              }}
            >
              For Providers
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
          Sensor Marketplace
        </p>
        <h1
          className="text-5xl font-light leading-tight"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
        >
          Autonomous Sensors on Tumbuh,
          <br />
          report plant data onchain.
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
            Sensor providers manufacture sensors with a private wallet. Once
            registered, sensors burn Unit Tokens to submit readings onchain.
          </li>
          <li>
            Each sensor wallet is tied to a unit type — the token it will burn
            when reporting data. You can also track a sensor using our favourite
            tool.
          </li>
        </ul>
      </section>

      {/* Register Form */}
      {authenticated && <RegisterSensorWallet onRegistered={fetchWallets} />}

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
            {sensorWallets.length} Registered Sensors
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Mainnet
          </p>
        </div>

        {sensorWallets.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No sensors registered yet.
          </p>
        ) : (
          <div
            className="grid gap-px"
            style={{
              gridTemplateColumns: "repeat(3, 1fr)",
              background: "var(--border)",
            }}
          >
            {sensorWallets.map((sw) => {
              const isConnected =
                authenticated &&
                walletAddress &&
                sw.wallet_address.toLowerCase() === walletAddress.toLowerCase();

              return (
                <div
                  key={sw.id}
                  style={{
                    background: "var(--bg-card)",
                    padding: "28px 24px",
                    transition: "background 0.15s",
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
                        className="text-base font-medium mb-1 font-mono"
                        style={{
                          color: "var(--text-primary)",
                          lineHeight: "1.4",
                        }}
                      >
                        {shortAddress(sw.wallet_address)}
                      </p>
                      <p
                        className="text-xs font-mono"
                        style={{
                          color: "var(--text-muted)",
                          wordBreak: "break-all",
                        }}
                      >
                        {sw.wallet_address}
                      </p>
                    </div>
                    <span
                      className="text-xs tracking-widest uppercase"
                      style={{
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                        marginLeft: "12px",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTrackingSensor(sw);
                      }}
                    >
                      Track →
                    </span>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p
                        className="text-xs mb-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Registered
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {new Date(sw.registered_at).toLocaleDateString()}
                      </p>
                    </div>
                    {isConnected && (
                      <span
                        className="text-xs tracking-widest uppercase"
                        style={{
                          color: "var(--text-secondary)",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {sw.unit_symbol} Sensor
                      </span>
                    )}
                  </div>

                  {isConnected && wallets[0] && <BurnForm sensorWallet={sw} />}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {trackingSensor && (
        <TrackDialog
          sensorWallet={trackingSensor}
          onClose={() => setTrackingSensor(null)}
        />
      )}

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div className="px-8 py-6 flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Sensors Marketplace
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Built on Solana
          </p>
        </div>
      </div>
    </div>
  );
}
