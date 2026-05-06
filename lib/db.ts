import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_DB_URL!, { ssl: "require" });

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS sensors (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      mint_address TEXT NOT NULL UNIQUE,
      signature TEXT NOT NULL,
      owner_address TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sensor_wallets (
      id SERIAL PRIMARY KEY,
      wallet_address TEXT NOT NULL UNIQUE,
      unit_symbol TEXT NOT NULL,
      mint_address TEXT NOT NULL,
      registered_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function saveSensor(data: {
  name: string;
  symbol: string;
  mintAddress: string;
  signature: string;
  ownerAddress: string;
}) {
  await sql`
    INSERT INTO sensors (name, symbol, mint_address, signature, owner_address)
    VALUES (${data.name}, ${data.symbol}, ${data.mintAddress}, ${data.signature}, ${data.ownerAddress})
  `;
}

export async function listSensors() {
  return sql<
    {
      id: number;
      name: string;
      symbol: string;
      mint_address: string;
      signature: string;
      owner_address: string;
      created_at: string;
    }[]
  >`SELECT * FROM sensors ORDER BY created_at DESC`;
}

export async function saveWallet(data: {
  walletAddress: string;
  unitSymbol: string;
  mintAddress: string;
}) {
  await sql`
    INSERT INTO sensor_wallets (wallet_address, unit_symbol, mint_address)
    VALUES (${data.walletAddress}, ${data.unitSymbol}, ${data.mintAddress})
    ON CONFLICT (wallet_address) DO UPDATE SET unit_symbol = ${data.unitSymbol}, mint_address = ${data.mintAddress}
  `;
}

export async function listWallets() {
  return sql<
    {
      id: number;
      wallet_address: string;
      unit_symbol: string;
      mint_address: string;
      registered_at: string;
    }[]
  >`SELECT * FROM sensor_wallets ORDER BY registered_at DESC`;
}

export async function getWalletByAddress(address: string) {
  const rows = await sql<{ id: number; wallet_address: string; unit_symbol: string; mint_address: string; registered_at: string }[]>`
    SELECT * FROM sensor_wallets WHERE wallet_address = ${address} LIMIT 1
  `;
  return rows[0] ?? null;
}

export default sql;
