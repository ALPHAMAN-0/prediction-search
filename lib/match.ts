import type { NormalizedMarket, ArbitrageGroup } from "./types";

// -------- Tokenization & synonyms (lightweight, no external deps) --------

const STOPWORDS = new Set([
  "the","a","an","of","to","in","on","for","by","with","at","and","or","is","be","will","be","this","that",
  "do","does","did","have","has","had","there","their","its","it","as","from","are","was","were","but","if",
  "than","then","so","what","when","who","which","how","why","over","under","more","less","most","least",
]);

const SYNONYMS: Record<string, string[]> = {
  // politics
  "president": ["potus", "presidential", "white house"],
  "election": ["vote", "ballot", "poll", "primary"],
  "trump": ["donald trump", "trumps"],
  "biden": ["joe biden", "bidens"],
  "shutdown": ["government shutdown", "govt shutdown"],
  // finance / econ
  "bitcoin": ["btc", "xbt"],
  "ethereum": ["eth", "ether"],
  "crypto": ["cryptocurrency", "token"],
  "stock": ["equity", "share", "shares"],
  "market": ["markets", "exchange"],
  "recession": ["downturn", "contraction"],
  "inflation": ["cpi", "prices"],
  "rate": ["rates", "interest rate", "fed rate", "fomc"],
  "fed": ["federal reserve", "fomc", "powell"],
  "gdp": ["growth", "economy"],
  // sports
  "nfl": ["football", "superbowl", "super bowl"],
  "nba": ["basketball"],
  "mlb": ["baseball", "world series"],
  "soccer": ["football", "epl", "premier league", "fifa"],
  "ufc": ["mma"],
  // tech
  "ai": ["artificial intelligence", "llm", "gpt", "chatgpt", "openai", "anthropic", "claude", "gemini"],
  "openai": ["chatgpt", "gpt"],
  "apple": ["aapl", "iphone"],
  "google": ["alphabet", "googl", "gemini"],
  "tesla": ["tsla", "elon"],
  "spacex": ["starship", "falcon"],
  // weather
  "hurricane": ["cyclone", "typhoon", "storm"],
  "temperature": ["temp", "degrees", "weather"],
  // generic
  "win": ["wins", "winner", "victory"],
  "lose": ["loses", "loss", "defeat"],
  "before": ["by", "prior to", "until"],
  "after": ["following", "post"],
  "year": ["yr", "annual"],
  "price": ["cost", "value", "trading at"],
  "above": ["over", "higher than", "exceed", "exceeds"],
  "below": ["under", "lower than", "less than"],
};

function expandToken(t: string): string[] {
  const lower = t.toLowerCase();
  const out = new Set<string>([lower]);
  for (const [key, syns] of Object.entries(SYNONYMS)) {
    if (lower === key || syns.includes(lower)) {
      out.add(key);
      for (const s of syns) out.add(s);
    }
  }
  return [...out];
}

export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9$%.\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

export function expandQuery(q: string): string[] {
  const base = tokenize(q);
  const expanded = new Set<string>();
  for (const t of base) for (const e of expandToken(t)) expanded.add(e);
  return [...expanded];
}

// -------- Scoring --------

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  const re = new RegExp(`\\b${escapeRegex(needle)}\\b`, "gi");
  return (haystack.match(re) || []).length;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function scoreMarket(market: NormalizedMarket, query: string, queryTokens: string[]): number {
  if (!query.trim()) return 0;
  const title = (market.title || "").toLowerCase();
  const desc = (market.description || "").toLowerCase();
  const tags = (market.tags || []).join(" ").toLowerCase();
  const category = (market.category || "").toLowerCase();

  let score = 0;
  let titleTokenHits = 0;
  const queryTokenCount = queryTokens.length || 1;

  // Exact phrase boost (huge)
  const qLower = query.toLowerCase().trim();
  if (qLower.length >= 3 && title.includes(qLower)) score += 80;
  if (qLower.length >= 3 && desc.includes(qLower)) score += 2;

  // Token-level scoring with synonym expansion
  for (const t of queryTokens) {
    const variants = expandToken(t);
    let bestTokenScore = 0;
    let titleHit = false;
    for (const v of variants) {
      let s = 0;
      if (countOccurrences(title, v) > 0) { s += 25; titleHit = true; }
      if (countOccurrences(tags, v) > 0) s += 8;
      if (countOccurrences(category, v) > 0) s += 6;
      if (s > bestTokenScore) bestTokenScore = s;
    }
    score += bestTokenScore;
    if (titleHit) titleTokenHits += 1;
  }

  // Coverage: reward markets that match MORE of the user's tokens in the title
  if (titleTokenHits > 0) {
    const coverage = titleTokenHits / queryTokenCount;
    score += coverage * 30;
  }

  // Very hard penalty for zero title hits — they only matched in tags/category
  if (titleTokenHits === 0) {
    score *= 0.05;
  }

  // Activity boost — only meaningful when there is a relevance match
  const vol = market.volume24h || market.totalVolume || 0;
  if (vol > 0 && score > 6) score += Math.log10(vol + 10) * 0.3;

  return score;
}

// -------- Arbitrage / equivalence detection --------

function fingerprint(title: string): string {
  // Strip dates, numbers, and platform-specific phrasing to detect the same event
  const t = title
    .toLowerCase()
    .replace(/will\s+/g, "")
    .replace(/\?/g, "")
    .replace(/\b(2026|2025|2027|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b\.?\s*\d{0,2}/gi, "")
    .replace(/\$[\d,.]+[kmb]?/gi, "$N")
    .replace(/\b\d+(\.\d+)?\s?(usd|%|percent|bps|basis points|points?)\b/gi, "N$1")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Use token multiset (sorted unique tokens) as a loose fingerprint
  const tokens = [...new Set(tokenize(t))].sort();
  return tokens.slice(0, 12).join(" ");
}

export function detectArbitrage(markets: NormalizedMarket[], minSpread = 0.02): ArbitrageGroup[] {
  const groups = new Map<string, NormalizedMarket[]>();
  for (const m of markets) {
    const fp = fingerprint(m.title);
    if (fp.length < 6) continue;
    const arr = groups.get(fp) || [];
    arr.push(m);
    groups.set(fp, arr);
  }
  const result: ArbitrageGroup[] = [];
  for (const [fp, list] of groups) {
    if (list.length < 2) continue;
    const platforms = new Set(list.map((m) => m.platform));
    if (platforms.size < 2) continue;
    const yesPrices = list.map((m) => m.yesPrice);
    const max = Math.max(...yesPrices);
    const min = Math.min(...yesPrices);
    const spread = max - min;
    if (spread >= minSpread) {
      // Pick a canonical title (longest one)
      const canonical = list.reduce((a, b) => (b.title.length > a.title.length ? b : a)).title;
      result.push({ fingerprint: fp, canonicalTitle: canonical, markets: list, spread });
    }
  }
  return result.sort((a, b) => b.spread - a.spread);
}

// -------- Filtering --------

export interface FilterOptions {
  platform?: string;        // "all" | "polymarket" | "kalshi" | "manifold"
  category?: string;        // "all" | "<category>"
  minYes?: number;          // 0..1
  maxYes?: number;          // 0..1
  minVolume24h?: number;
  closesWithinDays?: number;
}

export function applyFilters(
  markets: NormalizedMarket[],
  f: FilterOptions,
  now: number = Date.now()
): NormalizedMarket[] {
  return markets.filter((m) => {
    if (f.platform && f.platform !== "all" && m.platform !== f.platform) return false;
    if (f.category && f.category !== "all" && (m.category || "").toLowerCase() !== f.category.toLowerCase()) return false;
    if (typeof f.minYes === "number" && m.yesPrice < f.minYes) return false;
    if (typeof f.maxYes === "number" && m.yesPrice > f.maxYes) return false;
    if (typeof f.minVolume24h === "number" && (m.volume24h || 0) < f.minVolume24h) return false;
    if (typeof f.closesWithinDays === "number" && m.closesAt) {
      const t = Date.parse(m.closesAt);
      if (Number.isFinite(t)) {
        const days = (t - now) / (1000 * 60 * 60 * 24);
        if (days > f.closesWithinDays) return false;
      }
    }
    return true;
  });
}
