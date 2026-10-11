"use client";

import { fmtPct, fmtMoney, fmtDate, fmtRelative, PLATFORM_INFO } from "@/lib/format";
import type { NormalizedMarket } from "@/lib/types";
import { useState } from "react";
import { Bookmark, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";

interface Props {
  market: NormalizedMarket;
  watchlist: Set<string>;
  onToggleWatch: (id: string) => void;
}

export default function MarketCard({ market, watchlist, onToggleWatch }: Props) {
  const info = PLATFORM_INFO[market.platform] || { label: market.platform, color: "#888", bg: "rgba(255,255,255,0.05)", short: "?" };
  const watching = watchlist.has(market.id);
  const [hover, setHover] = useState(false);

  const yesPct = market.yesPrice;
  const noPct = market.noPrice;
  const closesRel = market.closesAt ? fmtRelative(market.closesAt) : "";

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group relative rounded-2xl border border-border bg-surface/80 backdrop-blur p-4 hover:border-accent/40 transition-colors"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border"
            style={{ color: info.color, borderColor: info.color, background: info.bg }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: info.color }} />
            {info.short}
          </span>
          {market.category && (
            <span className="text-[11px] text-muted truncate">{market.category}</span>
          )}
        </div>
        <button
          onClick={(e) => { e.preventDefault(); onToggleWatch(market.id); }}
          aria-label={watching ? "Remove from watchlist" : "Save to watchlist"}
          className={`p-1.5 rounded-md border border-border hover:border-accent/40 transition-colors ${watching ? "text-accent" : "text-muted"}`}
        >
          <Bookmark size={14} fill={watching ? "currentColor" : "none"} />
        </button>
      </header>

      <h3 className="mt-2 text-[15px] leading-snug font-medium text-text line-clamp-3">
        {market.title}
      </h3>

      {market.description && (
        <p className="mt-1.5 text-[12px] text-muted line-clamp-2">{market.description}</p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <ProbabilityBar yes={yesPct} no={noPct} />
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            {yesPct >= 0.5 ? <TrendingUp size={12} className="text-yes" /> : <TrendingDown size={12} className="text-no" />}
            <span className="text-text font-semibold">{fmtPct(yesPct)}</span>
            <span>YES</span>
          </span>
          <span>·</span>
          <span>
            <span className="text-text font-semibold">{fmtPct(noPct)}</span> NO
          </span>
        </div>
        <div className="flex items-center gap-2">
          {typeof market.volume24h === "number" && market.volume24h > 0 && (
            <span>Vol {fmtMoney(market.volume24h)}</span>
          )}
          {closesRel && <span>· {closesRel}</span>}
        </div>
      </div>

      <a
        href={market.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-3 inline-flex items-center gap-1 text-[12px] text-accent2 hover:underline ${hover ? "opacity-100" : "opacity-70"} transition-opacity`}
      >
        Open on {info.label} <ExternalLink size={12} />
      </a>
    </article>
  );
}

function ProbabilityBar({ yes, no }: { yes: number; no: number }) {
  const yesPct = Math.max(2, Math.min(98, yes * 100));
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[10px] text-muted mb-1">
        <span>YES {fmtPct(yes, 0)}</span>
        <span>NO {fmtPct(no, 0)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface2 overflow-hidden flex">
        <div
          className="h-full bg-yes"
          style={{ width: `${yesPct}%` }}
        />
        <div
          className="h-full bg-no"
          style={{ width: `${100 - yesPct}%` }}
        />
      </div>
    </div>
  );
}
