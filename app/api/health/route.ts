import { NextResponse } from "next/server";
import { getAllMarkets } from "@/lib/aggregator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const t0 = Date.now();
  const markets = await getAllMarkets();
  const byPlatform: Record<string, number> = {};
  for (const m of markets) byPlatform[m.platform] = (byPlatform[m.platform] || 0) + 1;
  return NextResponse.json({
    ok: true,
    total: markets.length,
    byPlatform,
    tookMs: Date.now() - t0,
  });
}
