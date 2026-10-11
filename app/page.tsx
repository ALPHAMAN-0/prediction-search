"use client";

import { useEffect, useMemo, useState } from "react";
import SearchBar from "@/components/SearchBar";
import Filters from "@/components/Filters";
import MarketCard from "@/components/MarketCard";
import ArbitrageList from "@/components/ArbitrageList";
import { useWatchlist } from "@/lib/useWatchlist";
import type { NormalizedMarket, ArbitrageGroup } from "@/lib/types";
import { Loader2, Flame, Clock, Star } from "lucide-react";

interface SearchResp {
  query: string;
  count: number;
  returned: number;
  tookMs: number;
  platforms: Record<string, number>;
  categories: Record<string, number>;
  results: NormalizedMarket[];
  arbitrage: ArbitrageGroup[];
  expanded?: string[];
}

const SUGGESTIONS = [
  "government shutdown 2026",
  "bitcoin end of year",
  "Fed rate cut",
  "Super Bowl winner",
  "OpenAI GPT-5",
  "recession",
  "Trump",
  "Apple stock",
  "hurricane",
  "Ethereum",
];

export default function HomePage() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [platform, setPlatform] = useState("all");
  const [category, setCategory] = useState("all");
  const [minYes, setMinYes] = useState(0);
  const [maxYes, setMaxYes] = useState(1);
  const [closesWithinDays, setClosesWithinDays] = useState(0);
  const [resp, setResp] = useState<SearchResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"results" | "watchlist" | "arbitrage">("results");
  const [watchlist, toggleWatch, watchHydrated] = useWatchlist();

  // Build a quick lookup for watchlist tab
  const [allMarkets, setAllMarkets] = useState<NormalizedMarket[]>([]);
  useEffect(() => {
    fetch("/api/search?limit=200")
      .then((r) => r.json())
      .then((d) => setAllMarkets(d.results || []))
      .catch(() => {});
  }, []);

  const watchedMarkets = useMemo(
    () => allMarkets.filter((m) => watchlist.has(m.id)),
    [allMarkets, watchlist]
  );

  async function runSearch(query: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      params.set("platform", platform);
      params.set("category", category);
      if (minYes > 0) params.set("minYes", String(minYes));
      if (maxYes < 1) params.set("maxYes", String(maxYes));
      if (closesWithinDays > 0) params.set("closesWithinDays", String(closesWithinDays));
      params.set("limit", "60");
      params.set("arbitrage", "1");
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data: SearchResp = await res.json();
      setResp(data);
    } catch (e: any) {
      setError(e?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runSearch(submitted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, platform, category, minYes, maxYes, closesWithinDays]);

  const categories = useMemo(
    () => Object.entries(resp?.categories || {}).sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 20),
    [resp]
  );

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <header className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface/60 text-[11px] text-muted mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-yes animate-pulse" /> live · Polymarket · Kalshi · Manifold
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          <span className="text-text">Search every</span>{" "}
          <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">prediction market</span>
          <br className="sm:hidden" />
          <span className="text-text"> at once.</span>
        </h1>
        <p className="mt-3 text-muted text-[14px] max-w-2xl mx-auto">
          One search bar across Polymarket, Kalshi and Manifold. Plain English. Cross-platform prices, arbitrage detection, and a personal watchlist.
        </p>
      </header>

      <div className="max-w-3xl mx-auto">
        <SearchBar
          value={q}
          onChange={setQ}
          onSubmit={() => setSubmitted(q.trim())}
          suggestions={SUGGESTIONS}
          loading={loading}
        />
        <div className="mt-2 text-[11px] text-muted text-center">
          {resp && (
            <>
              {resp.count.toLocaleString()} matches · {resp.tookMs}ms
              {resp.expanded && resp.expanded.length > 0 && q && (
                <> · also searched: <span className="text-text/80">{resp.expanded.slice(0, 8).join(", ")}</span></>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        <TabBtn current={activeTab} tab="results" onClick={() => setActiveTab("results")} icon={<Flame size={14} />}>Results</TabBtn>
        <TabBtn current={activeTab} tab="arbitrage" onClick={() => setActiveTab("arbitrage")} icon={<Clock size={14} />}>Arbitrage</TabBtn>
        <TabBtn current={activeTab} tab="watchlist" onClick={() => setActiveTab("watchlist")} icon={<Star size={14} />}>
          Watchlist{watchHydrated && watchlist.size > 0 ? ` (${watchlist.size})` : ""}
        </TabBtn>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <Filters
          platform={platform} setPlatform={setPlatform}
          category={category} setCategory={setCategory}
          minYes={minYes} setMinYes={setMinYes}
          maxYes={maxYes} setMaxYes={setMaxYes}
          closesWithinDays={closesWithinDays} setClosesWithinDays={setClosesWithinDays}
          categories={categories}
          platformCounts={resp?.platforms}
          categoryCounts={resp?.categories}
          totalResults={resp?.count || 0}
        />

        <section>
          {error && (
            <div className="rounded-xl border border-no/30 bg-no/10 text-no p-3 text-[13px]">
              {error}
            </div>
          )}

          {activeTab === "results" && (
            <>
              {loading && !resp && (
                <div className="flex items-center justify-center py-16 text-muted">
                  <Loader2 className="animate-spin mr-2" size={16} /> loading markets…
                </div>
              )}

              {resp && resp.arbitrage && resp.arbitrage.length > 0 && (
                <ArbitrageList groups={resp.arbitrage} />
              )}

              {resp && resp.results.length === 0 && !loading && (
                <div className="rounded-2xl border border-border bg-surface/60 p-10 text-center">
                  <div className="text-text text-[15px] mb-1">No matching predictions.</div>
                  <div className="text-muted text-[13px]">Try fewer filters, or a broader query.</div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {resp?.results.map((m) => (
                  <MarketCard
                    key={m.id}
                    market={m}
                    watchlist={watchlist}
                    onToggleWatch={toggleWatch}
                  />
                ))}
              </div>
            </>
          )}

          {activeTab === "arbitrage" && (
            <ArbitrageList groups={resp?.arbitrage || []} />
          )}

          {activeTab === "watchlist" && (
            <div>
              {!watchHydrated && (
                <div className="text-muted text-[13px]">Loading watchlist…</div>
              )}
              {watchHydrated && watchedMarkets.length === 0 && (
                <div className="rounded-2xl border border-border bg-surface/60 p-10 text-center">
                  <div className="text-text text-[15px] mb-1">No saved markets yet.</div>
                  <div className="text-muted text-[13px]">Tap the bookmark icon on any prediction to track it.</div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {watchedMarkets.map((m) => (
                  <MarketCard
                    key={m.id}
                    market={m}
                    watchlist={watchlist}
                    onToggleWatch={toggleWatch}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <footer className="mt-16 text-center text-[11px] text-muted">
        Built to outperform single-platform search: unified index, semantic query expansion, anonymous, sub-second.
        Data refreshes every 60–90s. Not financial advice.
      </footer>
    </main>
  );
}

function TabBtn({
  current, tab, onClick, children, icon,
}: { current: string; tab: "results" | "watchlist" | "arbitrage"; onClick: () => void; children: React.ReactNode; icon?: React.ReactNode }) {
  const active = current === tab;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
        active ? "border-accent/50 bg-accent/10 text-text" : "border-border hover:border-accent/30 text-muted"
      }`}
    >
      {icon}{children}
    </button>
  );
}
