# Prediction Search — Iteration Benchmarks

Run after each code change. Grade: ✓ great / ⚠ ok / ✗ bad.

## Tests

| # | Query | What it measures | Pass criteria |
|---|---|---|---|
| 1 | `bitcoin` | Coverage + crypto category | ≥1 result, top is Bitcoin market |
| 2 | `btc` | Synonym expansion (btc→bitcoin) | ≥1 result, top is Bitcoin market |
| 3 | `Fed rate cut` | Multi-token + synonym (Fed→federal reserve) | ≥1 result, top is Fed/FOMC market |
| 4 | `government shutdown` | Phrase + synonym | ≥1 result, top is shutdown market |
| 5 | `Trump` | Single-token politics | ≥1 result, top is Trump market |
| 6 | `OpenAI` | Niche tech (long-tail) | ≥1 result |
| 7 | `recession` | Niche economy | ≥1 result |
| 8 | `Super Bowl` | Phrase-only title match | ≥1 result, top is Super Bowl (not "Super Over" cricket) |
| 9 | `bitcoin 100k` | Mixed (token + numeric) | ≥1 result, top mentions $100k |
| 10 | `ai` (no quotes) | Broad term — should NOT return 0 | ≥1 result |

## Grade each result

- **✓ great** — top result is clearly what a human would click first
- **⚠ ok** — relevant results exist, but ordering is imperfect
- **✗ bad** — top result is wrong, or zero results for a reasonable query

## Competitor reference

For comparison, the same queries on:
- https://polymarket.com/ (mostly category browsing, no global search)
- https://kalshi.com/ (search behind login)
- https://www.google.com/search?q=site:polymarket.com+bitcoin (best baseline)

Predictry should beat single-platform search for any query that requires
combining data (arbitrage detection) or synonym understanding.
