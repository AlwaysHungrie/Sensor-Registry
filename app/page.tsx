"use client";

import { usePrivy } from "@privy-io/react-auth";
import { CreateSensorForm } from "@/components/CreateSensorForm";

const SENSORS = [
  {
    id: "SN-001",
    name: "Urban Air Quality Node",
    location: "Berlin, DE",
    type: "Environmental",
    freq: "1 min",
    price: "0.4 SOL/mo",
  },
  {
    id: "SN-002",
    name: "Bridge Structural Monitor",
    location: "Tokyo, JP",
    type: "Structural",
    freq: "100 ms",
    price: "1.2 SOL/mo",
  },
  {
    id: "SN-003",
    name: "Port Container Tracker",
    location: "Rotterdam, NL",
    type: "Logistics",
    freq: "5 min",
    price: "0.6 SOL/mo",
  },
  {
    id: "SN-004",
    name: "Soil Moisture Array",
    location: "Iowa, US",
    type: "Agricultural",
    freq: "15 min",
    price: "0.2 SOL/mo",
  },
  {
    id: "SN-005",
    name: "Traffic Density Mesh",
    location: "São Paulo, BR",
    type: "Urban",
    freq: "30 s",
    price: "0.8 SOL/mo",
  },
  {
    id: "SN-006",
    name: "Seismic Station Alpha",
    location: "Christchurch, NZ",
    type: "Geophysical",
    freq: "10 ms",
    price: "2.0 SOL/mo",
  },
];

export default function Home() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  const walletAddress = user?.wallet?.address;
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

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
        <span
          className="text-sm font-medium tracking-widest uppercase"
          style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
        >
          Sensors <span className="lowercase opacity-50">@tumbuh</span>
        </span>
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
              ? (shortAddress ?? "Disconnect")
              : "Connect"}
        </button>
      </header>

      {/* Hero */}
      <section className="px-8 pt-24 pb-20">
        <p
          className="text-xs tracking-widest uppercase mb-8"
          style={{ color: "var(--text-muted)", letterSpacing: "0.2em" }}
        >
          For Sensor Providers
        </p>
        <h1
          className="text-5xl font-light leading-tight"
          style={{
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Real-world sensors,
          <br />
          that power our Autonomous Plants.
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
            Autonomous Sensors on Tumbuh emit onchain data by regularly burning
            Unit Tokens. Unit Tokens are controlled and sold by sensor providers
            to the autonomous sensor wallets to let them work.
          </li>
          <li>
            As a sensor provider, you have complete control over distribution of
            your sensor units and are responsible for ensuring your sensor
            wallets have enough Unit Tokens to report data.
          </li>
          <li>
            Use the form below to create a Unit Token for your sensor. You need
            to ensure the sensor has a wallet and when it wants to report a new
            reading, it does so by burning that amount of Unit Tokens.
          </li>
        </ul>
      </section>

      {/* Create Sensor Token Form */}
      {authenticated && <CreateSensorForm />}

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
            {SENSORS.length} active streams
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Updated live
          </p>
        </div>

        <div
          className="grid gap-px"
          style={{
            gridTemplateColumns: "repeat(3, 1fr)",
            background: "var(--border)",
          }}
        >
          {SENSORS.map((s) => (
            <div
              key={s.id}
              className="group cursor-pointer"
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
                <span
                  className="text-xs"
                  style={{
                    color: "var(--text-muted)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.id}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {s.type}
                </span>
              </div>
              <p
                className="text-base font-medium mb-1"
                style={{ color: "var(--text-primary)", lineHeight: "1.4" }}
              >
                {s.name}
              </p>
              <p
                className="text-sm mb-6"
                style={{ color: "var(--text-secondary)" }}
              >
                {s.location}
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <p
                    className="text-xs mb-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Frequency
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {s.freq}
                  </p>
                </div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {s.price}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

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
