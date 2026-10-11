import type { NormalizedMarket, Platform } from "../types";

const BASE = "https://gamma-api.polymarket.com/markets";
const PAGE_LIMIT = 500;
const MAX_PAGES = 8; // up to 4000 markets

interface PMMarket {
  id: string;
  conditionId?: string;
  slug: string;
  question: string;
  description?: string;
  category?: string;
  outcomes?: string;          // JSON string e.g. '["Yes","No"]'
  outcomePrices?: string;     // JSON string e.g. '["0.5","0.5"]'
  volume24hr?: number | string;
  volumeNum?: number | string;
  liquidityNum?: number | string;
  endDate?: string;
  createdAt?: string;
  tags?: Array<{ slug?: string; label?: string }> | string[];
}

function safeNum(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function parseJSONArray<T = string>(s?: string): T[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function fetchPolymarket(): Promise<NormalizedMarket[]> {
  try {
    // We need breadth, not just the most-traded. Today's 24h volume is dominated
    // by daily sports games, so a single "top by 24h volume" page would hide
    // every long-tail market (recession, OpenAI, etc). We pull several
    // different sort orders in parallel and de-duplicate by id.
    const [
      byVol24,
      byVolTotal,
      byNewest,
      byEndingSoon,
      byLiquidity,
    ] = await Promise.all([
      fetchPage({ limit: PAGE_LIMIT, order: "volume24hr",   ascending: "false" }),
      fetchPage({ limit: PAGE_LIMIT, order: "volumeNum",    ascending: "false" }),
      fetchPage({ limit: PAGE_LIMIT, order: "startDate",    ascending: "false" }),
      fetchPage({ limit: PAGE_LIMIT, order: "endDate",      ascending: "true"  }),
      fetchPage({ limit: PAGE_LIMIT, order: "liquidityNum", ascending: "false" }),
    ]);
    const seen = new Set<string>();
    const all: PMMarket[] = [];
    for (const m of [
      ...byVol24,
      ...byVolTotal,
      ...byNewest,
      ...byEndingSoon,
      ...byLiquidity,
    ]) {
      const key = String(m.id);
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(m);
    }
    const data = all;

    return data.map((m) => {
      const prices = parseJSONArray<string>(m.outcomePrices).map((p) => safeNum(p, 0.5));
      const outcomes = parseJSONArray<string>(m.outcomes);
      // Polymarket typically returns [Yes, No] prices
      let yes = 0.5;
      let no = 0.5;
      const yesIdx = outcomes.findIndex((o) => /^yes$/i.test(o));
      const noIdx = outcomes.findIndex((o) => /^no$/i.test(o));
      if (yesIdx >= 0 && prices[yesIdx] > 0) yes = prices[yesIdx];
      else if (prices[0] > 0) yes = prices[0];
      if (noIdx >= 0 && prices[noIdx] > 0) no = prices[noIdx];
      else if (prices[1] > 0) no = prices[1];
      // Sanity: if sum is wildly off, normalize
      if (yes + no > 0 && Math.abs(yes + no - 1) > 0.05) {
        const s = yes + no;
        yes = yes / s;
        no = no / s;
      }

      const tags: string[] = [];
      if (Array.isArray(m.tags)) {
        for (const t of m.tags) {
          if (typeof t === "string") tags.push(t);
          else if (t && typeof t === "object" && (t.label || t.slug)) tags.push(t.label || t.slug!);
        }
      }

      const platform: Platform = "polymarket";
      const cat = inferCategory(m.question, m.description, tags);
      return {
        id: `${platform}:${m.id}`,
        platform,
        externalId: m.id,
        title: m.question,
        description: m.description,
        category: cat,
        url: m.slug ? `https://polymarket.com/event/${m.slug}` : `https://polymarket.com`,
        yesPrice: yes,
        noPrice: no,
        volume24h: safeNum(m.volume24hr),
        totalVolume: safeNum(m.volumeNum),
        liquidity: safeNum(m.liquidityNum),
        closesAt: m.endDate,
        createdAt: m.createdAt,
        tags,
        raw: m,
      };
    });
  } catch (err) {
    console.error("[polymarket] fetch failed:", err);
    return [];
  }
}

interface PageOpts {
  limit: number;
  order: string;
  ascending: string;
}

async function fetchPage(opts: PageOpts): Promise<PMMarket[]> {
  const params = new URLSearchParams({
    closed: "false",
    active: "true",
    limit: String(opts.limit),
    order: opts.order,
    ascending: opts.ascending,
  });
  const url = `${BASE}?${params.toString()}`;
  const res = await fetch(url, {
    // Don't use Next's fetch cache for these — they're too large (>2MB) and
    // would be evicted. Our aggregator caches the normalized array instead.
    cache: "no-store",
    headers: { "user-agent": "predictry/0.1 (+https://predictry.local)" },
  });
  if (!res.ok) throw new Error(`Polymarket ${res.status}`);
  return await res.json();
}

// ---------- Public text search ----------
// Polymarket exposes a server-side full-text search at /public-search.
// We hit it on-demand per query so the local index doesn't have to contain
// every long-tail market.

interface PMSearchEvent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category?: string;
  endDate?: string;
  liquidity?: string | number;
  volume24hr?: string | number;
  volumeNum?: string | number;
  outcomes?: string;
  outcomePrices?: string;
}

interface PMSearchResponse {
  events: PMSearchEvent[];
  pagination?: { hasMore?: boolean; totalResults?: number };
}

export async function searchPolymarket(q: string, limit = 30): Promise<NormalizedMarket[]> {
  try {
    if (!q || !q.trim()) return [];
    const url = `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(q.trim())}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "user-agent": "predictry/0.1" },
    });
    if (!res.ok) return [];
    const data: PMSearchResponse = await res.json();
    const events = (data.events || []).slice(0, limit);
    return events.map((e) => {
      const prices = parseJSONArray<string>(e.outcomePrices).map((p) => safeNum(p, 0.5));
      const outcomes = parseJSONArray<string>(e.outcomes);
      let yes = 0.5;
      const yesIdx = outcomes.findIndex((o) => /^yes$/i.test(o));
      if (yesIdx >= 0 && prices[yesIdx] > 0) yes = prices[yesIdx];
      else if (prices[0] > 0) yes = prices[0];
      const no = Math.max(0, Math.min(1, 1 - yes));
      const platform: Platform = "polymarket";
      const cat = inferCategory(e.title, e.description, []);
      return {
        id: `${platform}:${e.id}`,
        platform,
        externalId: e.id,
        title: e.title,
        description: e.description,
        category: cat,
        url: `https://polymarket.com/event/${e.slug}`,
        yesPrice: yes,
        noPrice: no,
        volume24h: safeNum(e.volume24hr),
        totalVolume: safeNum(e.volumeNum),
        liquidity: safeNum(e.liquidity),
        closesAt: e.endDate,
        createdAt: undefined,
        tags: [],
        raw: e,
      };
    });
  } catch {
    return [];
  }
}

// ---------- Category inference ----------
// Polymarket's gamma API does not reliably return a category, so we derive one
// from title/description/tags. This is used to make the faceted category filter
// actually useful.

const CATEGORY_RULES: Array<{ name: string; keywords: RegExp }> = [
  { name: "Crypto",      keywords: /\b(bitcoin|btc|ethereum|eth|crypto|xbt|solana|sol|stablecoin|defi|nft|altcoin|coin)\b/i },
  { name: "Sports",      keywords: /\b(nfl|nba|mlb|nhl|soccer|football|basketball|baseball|tennis|golf|ufc|mma|boxing|f1|formula 1|nascar|olympics|world cup|premier league|la liga|epl|cricket|rugby|tennis|wimbledon|open championship|playoff|super bowl|championship|tournament|match|game|spread|moneyline|over\/under)\b/i },
  { name: "Politics",    keywords: /\b(election|president|presidential|congress|senate|democrat|republican|trump|biden|harris|desantis|obama|putin|zelensky|netanyahu|governor|primary|caucus|ballot|poll|vote|legislat|parliament|prime minister|shutdown|partisan|gop|dnc|rnc)\b/i },
  { name: "Geopolitics", keywords: /\b(russia|ukraine|china|taiwan|iran|israel|gaza|hamas|hezbollah|nato|war|invasion|sanction|treaty|tariff|missile|military|ceasefire|diplomac)\b/i },
  { name: "Economy",     keywords: /\b(recession|inflation|gdp|unemployment|federal reserve|interest rate|fomc|cpi|ppi|jobs report|fed|currency|dollar|euro|yen|yuan|treasury|yield|bond|stock market|s&p|nasdaq|dow)\b/i },
  { name: "Tech",        keywords: /\b(ai|openai|anthropic|chatgpt|gpt|claude|gemini|llm|apple|google|alphabet|microsoft|amazon|meta|nvidia|tesla|spacex|starship|space|robotaxi|iphone|android|chip|semiconductor|self.driving|model|release|launch|ipo)\b/i },
  { name: "Culture",     keywords: /\b(oscar|grammy|emmy|tony|netflix|disney|movie|film|album|song|celebrity|box office|boxoffice|taylor swift|beyonce|kanye|drake|streaming|spotify|youtube|tiktok|tv show|series)\b/i },
  { name: "Weather",     keywords: /\b(hurricane|tornado|typhoon|temperature|climate|el nin|la nin|heatwave|wildfire|flood|drought|snowfall|earthquake)\b/i },
  { name: "Science",     keywords: /\b(nasa|fda|cdc|vaccine|drug|trial|fusion|quantum|spacex|nuclear|climate change|covid|pandemic|virus)\b/i },
];

export function inferCategory(title?: string, desc?: string, tags: string[] = []): string {
  const blob = `${title || ""} ${desc || ""} ${tags.join(" ")}`;
  if (!blob.trim()) return "Other";
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(blob)) return rule.name;
  }
  return "Other";
}
