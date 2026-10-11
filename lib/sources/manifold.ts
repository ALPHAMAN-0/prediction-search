import type { NormalizedMarket, Platform } from "../types";
import { inferCategory } from "./polymarket";

const ENDPOINT = "https://api.manifold.markets/v0/markets?limit=500&sort=24-hour-volume";

interface ManifoldMarket {
  id: string;
  question: string;
  description?: string;
  groupSlug?: string;
  creatorUsername?: string;
  url: string;
  outcomeType: string;
  mechanism: string;
  probability?: number;
  pool?: { YES?: number; NO?: number };
  volume24Hours?: number;
  volume?: number;
  totalLiquidity?: number;
  closeTime?: number;
  createdTime?: number;
  tags?: string[];
  category?: string;
}

export async function fetchManifold(): Promise<NormalizedMarket[]> {
  try {
    const res = await fetch(ENDPOINT, {
      cache: "no-store",
      headers: { accept: "application/json", "user-agent": "predictry/0.1" },
    });
    if (!res.ok) throw new Error(`Manifold ${res.status}`);
    const data: ManifoldMarket[] = await res.json();

    return data
      .filter((m) => m.outcomeType === "BINARY")
      .map((m) => {
        const yes = typeof m.probability === "number" ? m.probability : 0.5;
        const no = 1 - yes;
        const platform: Platform = "manifold";
        return {
          id: `${platform}:${m.id}`,
          platform,
          externalId: m.id,
          title: m.question,
          description: m.description,
          category: inferCategory(m.question, m.description, m.tags),
          url: m.url,
          yesPrice: yes,
          noPrice: no,
          volume24h: m.volume24Hours,
          totalVolume: m.volume,
          liquidity: m.totalLiquidity,
          closesAt: m.closeTime ? new Date(m.closeTime).toISOString() : undefined,
          createdAt: m.createdTime ? new Date(m.createdTime).toISOString() : undefined,
          tags: m.tags || [],
          raw: m,
        };
      });
  } catch (err) {
    console.error("[manifold] fetch failed:", err);
    return [];
  }
}
