import type { NormalizedMarket, Platform } from "../types";
import { inferCategory } from "./polymarket";

const ENDPOINT = "https://api.elections.kalshi.com/trade-api/v2/markets?status=open&limit=500";

interface KalshiMarket {
  ticker: string;
  event_ticker?: string;
  title?: string;
  subtitle?: string;
  category?: string;
  yes_bid?: number;
  yes_ask?: number;
  no_bid?: number;
  no_ask?: number;
  last_price?: number;
  volume_24h?: number;
  volume?: number;
  open_interest?: number;
  close_time?: string;
  created_time?: string;
  rules_primary?: string;
}

function centsToProb(c?: number): number {
  if (c === undefined || c === null || Number.isNaN(c)) return 0.5;
  return Math.max(0, Math.min(1, c / 100));
}

function mid(yesBid?: number, yesAsk?: number, last?: number): number {
  if (typeof last === "number" && last > 0) return centsToProb(last);
  if (typeof yesBid === "number" && typeof yesAsk === "number" && yesBid + yesAsk > 0) {
    return centsToProb((yesBid + yesAsk) / 2);
  }
  if (typeof yesBid === "number") return centsToProb(yesBid);
  if (typeof yesAsk === "number") return centsToProb(yesAsk);
  return 0.5;
}

export async function fetchKalshi(): Promise<NormalizedMarket[]> {
  try {
    const res = await fetch(ENDPOINT, {
      cache: "no-store",
      headers: { accept: "application/json", "user-agent": "predictry/0.1" },
    });
    if (!res.ok) throw new Error(`Kalshi ${res.status}`);
    const json = await res.json();
    const list: KalshiMarket[] = json.markets || json.data || [];

    return list.map((m) => {
      const yes = mid(m.yes_bid, m.yes_ask, m.last_price);
      const no = Math.max(0, Math.min(1, 1 - yes));
      const platform: Platform = "kalshi";
      const title = m.title || m.subtitle || m.ticker;
      const desc = m.rules_primary || m.subtitle;
      return {
        id: `${platform}:${m.ticker}`,
        platform,
        externalId: m.ticker,
        title,
        description: desc,
        category: inferCategory(title, desc),
        url: `https://kalshi.com/markets/${m.event_ticker || m.ticker}`,
        yesPrice: yes,
        noPrice: no,
        volume24h: m.volume_24h,
        totalVolume: m.volume,
        liquidity: m.open_interest,
        closesAt: m.close_time,
        createdAt: m.created_time,
        tags: [],
        raw: m,
      };
    });
  } catch (err) {
    console.error("[kalshi] fetch failed:", err);
    return [];
  }
}
