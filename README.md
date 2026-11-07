# LETF Sniper

A live scanner for every US leveraged and inverse ETF (about 750 funds). It finds the big movers (like AXTX) and opens a full trade page for each fund.

Sister site: [SOXX Sniper](../SOXX-Sniper/) (SOXL only).

## What it does

**Main page**
- Scanner of all leveraged and inverse ETFs. Quotes update every 12 seconds.
- Tabs: top gainers, top losers, most traded ($), momentum (15 min), volume surge, extended hours, at day high.
- Filters: type (single stock, index, crypto, commodity, rates, volatility), long or inverse, 2× or 3×, minimum $ traded. Search by fund, stock or theme.
- Columns: leverage, underlying and its move, price, day move, 15-minute move (or extended hours), volume, $ traded, day range, gap vs. implied move, signals.
- Top mover cards, a heatmap of the 60 most traded funds, and "where the action is" by underlying (best long and inverse fund for each stock).
- Watchlist (★), the Sniper read bar, market strip.
- Alerts: big moves (single-stock funds at 10/20/30/50%, index funds at 5/10/15%), fast 15-minute moves, volume surges, extended-hours moves, and your own per-fund alerts. Each alert has Post and Copy buttons.
- Post kit with ready-to-post text for X and StockTwits.

**Fund page** (`#/f/AXTX`)
- Candle chart (1 day 1m, 5 days 5m, 1 year daily) with a visible-range volume profile (up to 200 rows), POC, value area (70%), HVN and LVN lines, session VWAP ±1σ ±2σ, EMA 9/21 and the plan levels.
- Level-to-level setup (from the tradewriter441 volume profile method):
  1. High-volume nodes (HVN) are balance. Low-volume nodes (LVN) are air pockets.
  2. Price moves from node to node.
  3. Three filters must agree: structure (higher lows / lower highs on 5-minute swings), trend (30-minute and 1-hour EMA 9/21), momentum (RSI, EMA, MACD).
  4. Target = next HVN. Stop = past the HVN behind price. Reward : risk is shown.
- Big-move radar: relative volume, move size in σ, range vs ATR, VWAP distance, opening range break, 5-minute burst, 52-week position.
- Underlying vs. fund (implied move and gap) and all sister funds on the same underlying.
- Leverage decay: daily drag ≈ L(L−1)/2 × σ², with 1-week, 1-month and 1-year cost.
- Live news search (every 60 s), StockTwits pulse, and per-fund alerts (price above, price below, day move, new headlines).

Light and dark mode, heartbeat, contact page, Pro card, and demo mode (`index.html?demo`).

## Data

| Data | Source | Worker endpoint |
|---|---|---|
| Fund list | Nasdaq ETF screener (cached 12 h) | `/letf/list` |
| Live quotes for all funds and underlyings | StockTwits batch quotes (cached 9 s) | `/letf/quotes` |
| Charts | Yahoo Finance | `/chart` |
| Index levels | StockTwits + Yahoo | `/ext` |
| News | Google News + Yahoo RSS | `/news` |
| StockTwits messages | StockTwits | `/social` |

The site uses the same Cloudflare Worker as SOXX Sniper. Both sites are on `stevenwsharp-ctrl.github.io`, so the Worker URL saved on one site is also on the other.

## Setup

1. Deploy the updated `worker.js` (it adds `/letf/list` and `/letf/quotes`). SOXX Sniper keeps working with it.
2. Make a new public GitHub repo named `LETF-Sniper`.
3. Upload `index.html` and `README.md`.
4. Settings → Pages → Deploy from branch `main`, folder `/ (root)`.
5. Open https://stevenwsharp-ctrl.github.io/LETF-Sniper/ . If the Worker URL is not filled in, open Settings and add it.

## Files

| File | Purpose |
|---|---|
| `index.html` | The full site (one file). |
| `README.md` | This file. |
| `worker.js` | Cloudflare Worker (shared with SOXX Sniper). Deploy it to Cloudflare, not to GitHub Pages. |

## Notes

- Thinly traded funds can show a last trade that is many minutes old. The scanner marks these with a dot and the "$ traded" filter hides them by default.
- Leveraged ETFs reset each day and lose value in choppy markets. Nothing here is investment advice.
- Contact: sniperdesk.tribunal635@passmail.net

## What worked this week (`lessons.js`)

A card at the top reads the paper bots' record from SOXX Sniper (`bots.json` on its `bots` branch): each entry idea's result on 2× and 3× funds over the last 7 market days, the scanner tab that matches it, whether the bots use it now, a warning in a half hour where 2×/3× entries clearly lost, and the Cohort Sniper weekly lesson (do not chase; place the limit order on the pull-back).

## First Breaths (fb.js · shared by LETF Sniper, SOXX Sniper, Cohort Sniper and Mastermind Investor)

A spider-web intelligence factor that finds the first signs of an inflection point. Open a stock, ETF or crypto (fund page, stock page, an open Cohort row, or a Mastermind search) and the First Breaths card shows two lists:

- **Reversal breaths** (the move may turn): RSI divergence, volume climax, rejection wick, VWAP 2.5σ snap back, failed breakout, structure break, engulfing bar, VWAP lost, squeeze or range break against the move.
- **Continuation breaths** (the move may amplify): range breakout on volume, pullback to EMA 20 held, flag breakout, squeeze release, higher low / lower high, momentum ignition, VWAP reclaimed.

A list with no breath is not shown. Each breath shows the exact bar it flashed on (1m or 5m bar close), when the page pushed it, its price, the ±1 ATR test levels, its learned reliability and how often it repeated.

- Live data: Yahoo 1-minute bars through the Worker every 15 s (stocks and ETFs, with extended hours); Hyperliquid 1-minute candles every 5 s (crypto and Hyperliquid markets). Only closed bars count.
- Learning: every breath is scored when its time is up (1m: 15 bars, 5m: 6 bars): a hit if price went +1 ATR its way before −1 ATR against it. On the first open, the last 3–5 days are scored at once. Reliability = this market's hit rate, pulled toward the same breath's rate on all markets of the same kind. Breaths that fail (under 46% over 30+) are hidden; ★ proven = 30+ scored and 57%+. The ranking favors strong, reliable and repeated breaths.
- Push: new breaths are highlighted; reliable, repeated or confirmed ones also pop up. Sound and browser notifications are buttons on the card.
- The live breaths feed the spider web as `fb.rev` and `fb.cont`, and the scored results go to the knowledge hub.
- No Worker change is needed (it uses the existing `/chart` route).
