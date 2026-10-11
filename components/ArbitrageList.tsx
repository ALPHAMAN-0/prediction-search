"use client";

import type { ArbitrageGroup } from "@/lib/types";
import { fmtPct, PLATFORM_INFO } from "@/lib/format";
import { ArrowRight } from "lucide-react";

interface Props {
  groups: ArbitrageGroup[];
}

export default function ArbitrageList({ groups }: Props) {
  if (!groups || groups.length === 0) return null;
  return (
    <section className="mb-8">
      <header className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold text-text">Cross-platform arbitrage</h2>
        <span className="text-[11px] text-muted">{groups.length} opportunities · same event, different prices</span>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {groups.slice(0, 6).map((g) => (
          <article key={g.fingerprint} className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
            <h3 className="text-[14px] font-medium text-text line-clamp-2">{g.canonicalTitle}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {g.markets.map((m) => {
                const info = PLATFORM_INFO[m.platform];
                return (
                  <a
                    key={m.id}
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface/80 hover:border-accent/40"
                  >
                    <span
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium"
                      style={{ color: info.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: info.color }} />
                      {info.short}
                    </span>
                    <span className="text-[13px] font-semibold">{fmtPct(m.yesPrice, 0)}</span>
                    <ArrowRight size={12} className="text-muted" />
                  </a>
                );
              })}
            </div>
            <div className="mt-2 text-[12px] text-accent2">
              spread: <span className="font-semibold">{(g.spread * 100).toFixed(1)} pts</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
