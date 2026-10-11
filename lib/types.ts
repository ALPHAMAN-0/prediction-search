export type Platform = "polymarket" | "kalshi" | "manifold" | "metaculus";

export interface NormalizedMarket {
  id: string;            // composite: platform:platformId
  platform: Platform;
  externalId: string;
  title: string;
  description?: string;
  category: string;
  url: string;
  yesPrice: number;      // 0..1 implied probability
  noPrice: number;       // 0..1
  volume24h?: number;
  totalVolume?: number;
  liquidity?: number;
  closesAt?: string;     // ISO
  createdAt?: string;    // ISO
  tags: string[];
  raw: unknown;
}

export interface ArbitrageGroup {
  fingerprint: string;
  canonicalTitle: string;
  markets: NormalizedMarket[];
  spread: number;        // max(yes) - min(yes) across platforms
}
