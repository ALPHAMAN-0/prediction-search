import { NextResponse } from "next/server";
import { getAllMarkets, getArbitrageOpportunities } from "@/lib/aggregator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const markets = await getAllMarkets();
  const groups = getArbitrageOpportunities(markets).slice(0, 50);
  return NextResponse.json({ count: groups.length, groups });
}
