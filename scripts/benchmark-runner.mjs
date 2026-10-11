// scripts/benchmark-runner.mjs
// Runs the 10 test queries against http://localhost:3210/api/search and prints a grade.
//
// Usage: node scripts/benchmark-runner.mjs

const BASE = process.env.BASE || "http://localhost:3210";

const TESTS = [
  { q: "bitcoin",            expectInTitle: "bitcoin",                tag: "coverage" },
  { q: "btc",                expectInTitle: "btc",                    tag: "synonym" },
  { q: "Fed rate cut",       expectInTitle: "fed",                    tag: "syn+multi" },
  { q: "government shutdown",expectInTitle: "shutdown",               tag: "phrase" },
  { q: "Trump",              expectInTitle: "trump",                  tag: "single" },
  { q: "OpenAI",             expectInTitle: "openai",                 tag: "niche" },
  { q: "recession",          expectInTitle: "recession",              tag: "niche" },
  { q: "Super Bowl",         expectInTitle: "super bowl",             tag: "phrase", notInTitle: "super over" },
  { q: "bitcoin 100k",       expectInTitle: "100",                    tag: "numeric" },
  { q: "ai",                 expectInTitle: "ai",                     tag: "broad" },
];

async function run(t) {
  const url = `${BASE}/api/search?q=${encodeURIComponent(t.q)}&limit=3`;
  const t0 = Date.now();
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  const dt = Date.now() - t0;
  if (!res.ok) return { ...t, error: `HTTP ${res.status}` };
  const data = await res.json();
  const top = data.results?.[0];
  return { ...t, tookMs: dt, count: data.count, topTitle: top?.title || "(none)", topUrl: top?.url };
}

function grade(t, r) {
  if (r.error) return "✗";
  if (!r.topTitle || r.topTitle === "(none)") return "✗ (no result)";
  const title = r.topTitle.toLowerCase();
  if (t.notInTitle && title.includes(t.notInTitle.toLowerCase())) return "⚠ (wrong hit)";
  if (t.expectInTitle && title.includes(t.expectInTitle.toLowerCase())) return "✓";
  // Bitcoin 100k: 100k is not always in title, may say $100,000
  if (t.tag === "numeric" && /(\$\s?100[,.]?000|100k)/.test(r.topTitle)) return "✓";
  if (t.tag === "broad" && r.count > 0) return "⚠ (broad);";
  return "⚠ (loose)";
}

(async () => {
  console.log(`\nBase: ${BASE}\n`);
  let pass = 0, warn = 0, fail = 0;
  for (const t of TESTS) {
    const r = await run(t);
    const g = grade(t, r);
    if (g.startsWith("✓")) pass++;
    else if (g.startsWith("⚠")) warn++;
    else fail++;
    const topShort = r.topTitle ? r.topTitle.slice(0, 70) : r.error || "(no result)";
    console.log(`${g}  ${r.tookMs ?? "??"}ms  count=${r.count ?? 0}  [${t.tag.padEnd(9)}]  q="${t.q}"`);
    console.log(`        -> ${topShort}${topShort.length >= 70 ? "…" : ""}`);
  }
  console.log(`\nSummary: ${pass} ✓   ${warn} ⚠   ${fail} ✗`);
})();
