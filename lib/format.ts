export const PLATFORM_INFO: Record<string, { label: string; color: string; bg: string; short: string }> = {
  polymarket: { label: "Polymarket", color: "#22d3ee", bg: "rgba(34,211,238,0.14)", short: "Poly" },
  kalshi:     { label: "Kalshi",     color: "#a78bfa", bg: "rgba(167,139,250,0.16)", short: "Kal" },
  manifold:   { label: "Manifold",   color: "#f59e0b", bg: "rgba(245,158,11,0.16)", short: "Mfld" },
};

export function fmtPct(p: number, digits = 0): string {
  if (!Number.isFinite(p)) return "—";
  return `${(p * 100).toFixed(digits)}%`;
}
export function fmtMoney(n?: number): string {
  if (!n || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}
export function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const d = new Date(t);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
export function fmtRelative(iso?: string, now = Date.now()): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diff = t - now;
  const days = Math.round(diff / 86_400_000);
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 30) return `in ${days}d`;
  if (days < 365) return `in ${Math.round(days / 30)}mo`;
  return `in ${(days / 365).toFixed(1)}y`;
}
