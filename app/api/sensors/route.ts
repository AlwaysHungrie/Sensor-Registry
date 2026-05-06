import { NextRequest, NextResponse } from "next/server";
import { initDb, saveSensor, listSensors } from "@/lib/db";

await initDb();

export async function GET() {
  try {
    const sensors = await listSensors();
    return NextResponse.json(sensors);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch sensors" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, symbol, mintAddress, signature, ownerAddress } = body;
    if (!name || !symbol || !mintAddress || !signature || !ownerAddress) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    await saveSensor({ name, symbol, mintAddress, signature, ownerAddress });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save sensor" }, { status: 500 });
  }
}
