# Sensors Marketplace — Tumbuh Network

Onchain sensor registry for autonomous plants. Physical sensors publish readings to Solana by burning Unit Tokens. Sensor providers (manufacturers) and sensor wallets are registered publicly.

## What it does

- **Sensor Registry** — register a sensor wallet + mint address, browse all registered sensors
- **Sensor Provider Registry** — link sensors to their manufacturers
- **Burn-to-record** — sensors burn Unit Tokens to record readings onchain
- **Data viewer** — inspect burn transactions + moisture readings per sensor via Dune Sim reports
- **Wallet auth** — Privy embedded wallets (Solana)

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Blockchain | Solana via `@solana/kit` |
| Token ops | `@metaplex-foundation/umi` + `mpl-token-metadata` |
| Auth | Privy (`@privy-io/react-auth`) |
| DB | Postgres (`postgres`) |
| Styling | Tailwind CSS v4 |

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key routes

| Route | Description |
|---|---|
| `/` | Sensor Registry — register, browse, burn tokens |
| `/providers` | Sensor Provider Registry |
| `/api/sensors` | CRUD for sensor wallets |
| `/api/wallets` | Registered wallet list |
| `/api/transactions` | Burn tx history (paginated) |

## How sensor data works

1. Physical sensor wallet is registered onchain with a Unit Token mint
2. Sensor reads data → burns equivalent Unit Tokens → transaction recorded on Solana
3. [Dune Sim](https://sim.dune.com) queries burn history to generate sensor reports
4. Autonomous plants consume reports to make decisions

## Env

```
# Privy
NEXT_PUBLIC_PRIVY_APP_ID=

# Postgres
DATABASE_URL=
```
