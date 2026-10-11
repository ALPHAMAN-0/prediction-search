import { NextRequest, NextResponse } from "next/server";
import { getAllMarkets, getArbitrageOpportunities } from "@/lib/aggregator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = decodeURIComponent(params.id);
  const markets = await getAllMarkets();
  const m = markets.find((x) => x.id === id);
  if (!m) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Find related markets (same fingerprint) for arbitrage
  const arb = getArbitrageOpportunities(markets);
  const related = arb.find((g) => g.markets.some((x) => x.id === id));

  return NextResponse.json({ market: m, related: related || null });
}
