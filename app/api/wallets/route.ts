import { NextRequest, NextResponse } from "next/server";
import { initDb, saveWallet, listWallets } from "@/lib/db";

await initDb();

export async function GET() {
  try {
    const wallets = await listWallets();
    return NextResponse.json(wallets);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch wallets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, unitSymbol, mintAddress } = body;
    if (!walletAddress || !unitSymbol || !mintAddress) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    await saveWallet({ walletAddress, unitSymbol, mintAddress });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save wallet" }, { status: 500 });
  }
}
