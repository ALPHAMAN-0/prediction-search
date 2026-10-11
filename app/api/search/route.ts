import { NextRequest, NextResponse } from "next/server";
import { getAllMarkets, getArbitrageOpportunities } from "@/lib/aggregator";
import { applyFilters, expandQuery, scoreMarket, tokenize } from "@/lib/match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const t0 = Date.now();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const platform = url.searchParams.get("platform") || "all";
  const category = url.searchParams.get("category") || "all";
  const minYes = parseFloatOrUndef(url.searchParams.get("minYes"));
  const maxYes = parseFloatOrUndef(url.searchParams.get("maxYes"));
  const minVolume24h = parseFloatOrUndef(url.searchParams.get("minVolume24h"));
  const closesWithinDays = parseFloatOrUndef(url.searchParams.get("closesWithinDays"));
  const limit = clampInt(parseInt(url.searchParams.get("limit") || "60", 10), 1, 200);
  const includeArbitrage = url.searchParams.get("arbitrage") === "1";

  const markets = await getAllMarkets();

  const filtered = applyFilters(markets, {
    platform, category, minYes, maxYes, minVolume24h, closesWithinDays,
  });

  let ranked = filtered;
  if (q) {
    const qTokens = expandQuery(q);
    const scored = filtered.map((m) => ({ m, s: scoreMarket(m, q, qTokens) }));
    scored.sort((a, b) => b.s - a.s);
    ranked = scored.filter((x) => x.s > 0).map((x) => x.m);
  } else {
    ranked = [...filtered].sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
  }

  const totalMatched = ranked.length;
  const results = ranked.slice(0, limit);

  let arbitrage: ReturnType<typeof getArbitrageOpportunities> = [];
  if (includeArbitrage) arbitrage = getArbitrageOpportunities(filtered).slice(0, 20);

  // Build faceted counts (light) for UI
  const platformCounts = aggregate(filtered, (m) => m.platform);
  const categoryCounts = aggregate(filtered, (m) => m.category || "Other");

  return NextResponse.json({
    query: q,
    tokens: tokenize(q),
    expanded: q ? expandQuery(q) : [],
    count: totalMatched,
    returned: results.length,
    tookMs: Date.now() - t0,
    platforms: platformCounts,
    categories: categoryCounts,
    results,
    arbitrage,
  });
}

function parseFloatOrUndef(v: string | null): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function clampInt(n: number, lo: number, hi: number) {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.floor(n)));
}
function aggregate<T>(arr: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of arr) {
    const k = key(a);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}
