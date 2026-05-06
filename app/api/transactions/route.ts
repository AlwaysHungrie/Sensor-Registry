import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const limit = searchParams.get("limit") ?? "20";
  const offset = searchParams.get("offset");

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const url = new URL(`https://api.sim.dune.com/beta/svm/transactions/${address}`);
  url.searchParams.set("limit", limit);
  if (offset) url.searchParams.set("offset", offset);

  const res = await fetch(url.toString(), {
    headers: { "X-Sim-Api-Key": process.env.DUNE_API_KEY ?? "" },
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Dune API error ${res.status}` }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
