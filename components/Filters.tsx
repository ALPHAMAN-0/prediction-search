"use client";

interface Props {
  platform: string;
  setPlatform: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  minYes: number;
  setMinYes: (v: number) => void;
  maxYes: number;
  setMaxYes: (v: number) => void;
  closesWithinDays: number;
  setClosesWithinDays: (v: number) => void;
  categories: string[];
  platformCounts?: Record<string, number>;
  categoryCounts?: Record<string, number>;
  totalResults: number;
}

export default function Filters(p: Props) {
  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface/80 p-4">
        <h4 className="text-[12px] uppercase tracking-wider text-muted mb-2">Platform</h4>
        <div className="space-y-1.5">
          {["all", "polymarket", "kalshi", "manifold"].map((pl) => (
            <button
              key={pl}
              onClick={() => p.setPlatform(pl)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] border transition-colors ${
                p.platform === pl
                  ? "border-accent/50 bg-accent/10 text-text"
                  : "border-border hover:border-accent/30 text-text/80"
              }`}
            >
              <span className="capitalize">{pl}</span>
              {p.platformCounts && (
                <span className="text-[11px] text-muted">
                  {p.platformCounts[pl] ?? (pl === "all" ? Object.values(p.platformCounts).reduce((a, b) => a + b, 0) : 0)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface/80 p-4">
        <h4 className="text-[12px] uppercase tracking-wider text-muted mb-2">Category</h4>
        <div className="max-h-48 overflow-y-auto space-y-1">
          <button
            onClick={() => p.setCategory("all")}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-[13px] border ${
              p.category === "all" ? "border-accent/50 bg-accent/10" : "border-border hover:border-accent/30"
            }`}
          >
            All
          </button>
          {p.categories.map((c) => (
            <button
              key={c}
              onClick={() => p.setCategory(c)}
              className={`w-full flex items-center justify-between text-left px-3 py-1.5 rounded-lg text-[13px] border ${
                p.category === c ? "border-accent/50 bg-accent/10" : "border-border hover:border-accent/30"
              }`}
            >
              <span className="truncate">{c}</span>
              {p.categoryCounts && (
                <span className="text-[11px] text-muted">{p.categoryCounts[c] ?? 0}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface/80 p-4">
        <h4 className="text-[12px] uppercase tracking-wider text-muted mb-3">YES probability</h4>
        <div className="flex items-center justify-between text-[12px] text-text/80 mb-2">
          <span>{Math.round(p.minYes * 100)}%</span>
          <span>{Math.round(p.maxYes * 100)}%</span>
        </div>
        <div className="space-y-3">
          <RangeSlider
            min={0} max={1} step={0.05}
            value={p.minYes}
            onChange={p.setMinYes}
          />
          <RangeSlider
            min={0} max={1} step={0.05}
            value={p.maxYes}
            onChange={p.setMaxYes}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            { l: "Any", lo: 0, hi: 1 },
            { l: "Likely 70%+", lo: 0.7, hi: 1 },
            { l: "Unlikely <30%", lo: 0, hi: 0.3 },
            { l: "50/50 ±10%", lo: 0.4, hi: 0.6 },
          ].map((q) => (
            <button
              key={q.l}
              onClick={() => { p.setMinYes(q.lo); p.setMaxYes(q.hi); }}
              className="text-[11px] px-2 py-1 rounded-full border border-border hover:border-accent/40"
            >
              {q.l}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface/80 p-4">
        <h4 className="text-[12px] uppercase tracking-wider text-muted mb-2">Closes within</h4>
        <div className="flex flex-wrap gap-1.5">
          {[0, 7, 30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => p.setClosesWithinDays(d)}
              className={`text-[12px] px-2.5 py-1 rounded-full border ${
                p.closesWithinDays === d
                  ? "border-accent/50 bg-accent/10"
                  : "border-border hover:border-accent/40"
              }`}
            >
              {d === 0 ? "any" : d === 365 ? "1y" : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[11px] text-muted px-1">
        {p.totalResults.toLocaleString()} matching markets
      </div>
    </aside>
  );
}

function RangeSlider({
  min, max, step, value, onChange,
}: { min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="range"
      min={min} max={max} step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-accent"
    />
  );
}
