import { fetchPolymarket } from "./sources/polymarket";
import { fetchKalshi } from "./sources/kalshi";
import { fetchManifold } from "./sources/manifold";
import type { NormalizedMarket } from "./types";
import { detectArbitrage } from "./match";

interface CacheEntry {
  ts: number;
  markets: NormalizedMarket[];
}

let cache: CacheEntry | null = null;
const TTL_MS = 60 * 1000;

export async function getAllMarkets(force = false): Promise<NormalizedMarket[]> {
  const now = Date.now();
  if (!force && cache && now - cache.ts < TTL_MS) return cache.markets;

  const [poly, kalshi, manifold] = await Promise.all([
    fetchPolymarket(),
    fetchKalshi(),
    fetchManifold(),
  ]);

  const markets = [...poly, ...kalshi, ...manifold];
  cache = { ts: now, markets };
  return markets;
}

export function getArbitrageOpportunities(markets: NormalizedMarket[]) {
  return detectArbitrage(markets, 0.02);
}
