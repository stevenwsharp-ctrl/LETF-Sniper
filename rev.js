/* LETF Sniper · hard reversal detector, and the fastest 1-minute and 5-minute moves.
   A hard reversal: in the last 30 minutes price made a big leg (8+ times its normal 1-minute move and 0.6%+), then gave
   back half or more of that leg within 8 minutes of the high (a top) or the low (a bottom). Score = share given back ×
   speed (the give-back in normal 1-minute moves) × volume (more volume after the turn counts more). Score 1+ = HARD.
   Data: 1-minute bars (the Worker's /chart) for the underlyings of the biggest movers and the most traded index funds,
   checked every minute; every other fund from this page's own quotes (every 12 s; kept for 50 minutes in this browser).
   Same underlying = same reading: a turn on AXTI shows on every AXTI fund, a bottom is "up" for the long funds and "down"
   for the inverse funds.
   Test: the same rule on the last 5 days of 1-minute bars of those markets: after each turn (one per 15 minutes per market),
   did price keep going the new way 5, 15 and 30 minutes later? Hit rate vs 50%, mean move, to the knowledge hub. */
(function () {
  "use strict";
  if (window.REVD) return; window.REVD = 1;
  const host = document.getElementById("scanCard"); if (!host) return;
  const card = document.createElement("section"); card.className = "card"; card.id = "revCard"; card.style.marginBottom = "12px"; host.before(card);
  const st = document.createElement("style"); st.textContent = `#revCard table{width:100%;border-collapse:collapse;font:12px var(--mono,monospace)}#revCard th,#revCard td{padding:4px 6px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}#revCard th{color:var(--dim,var(--faint));font-weight:600}#revCard td.l,#revCard th.l{text-align:left}#revCard .r3{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px}@media(max-width:1100px){#revCard .r3{grid-template-columns:1fr}}#revCard .hard{background:rgba(255,77,94,.08)}#revCard .tg{display:inline-block;font:700 10.5px var(--mono,monospace);border-radius:5px;padding:1px 6px;color:#fff}#revCard tr[data-f]{cursor:pointer}`;
  document.head.appendChild(st);
  const P = () => { try { return (localStorage.getItem("soxx_fred_proxy") || "").trim().replace(/\/+$/, ""); } catch (e) { return ""; } };
  const pc = (x, d) => isFinite(x) ? (x >= 0 ? "+" : "") + (x * 100).toFixed(d == null ? 2 : d) + "%" : "--", cl = x => x > 0 ? "up" : x < 0 ? "down" : "";
  const E = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // ---------- this page's quotes: kept in this browser for 50 minutes (a reload keeps the 1-min and 5-min moves) ----------
  const SK = "letf_snap_v1";
  try { const o = JSON.parse(sessionStorage.getItem(SK) || localStorage.getItem(SK) || "null"); if (o && Date.now() - o.at < 50 * 6e4) for (const s in o.d) { const a = o.d[s].filter(x => Date.now() - x[0] < 50 * 6e4); if (!a.length) continue; const cur = SNAP[s] || []; SNAP[s] = a.filter(x => !cur.length || x[0] < cur[0][0]).concat(cur); } } catch (e) { }
  setInterval(() => { try { const d = {}; (typeof ROWS !== "undefined" ? ROWS : []).filter(r => r.dv >= 1e6).forEach(r => { const a = SNAP[r.s]; if (!a) return; const o = []; let lt = 0; a.forEach(x => { if (x[0] - lt >= 2e4) { o.push(x); lt = x[0]; } }); d[r.s] = o; }); const j = JSON.stringify({ at: Date.now(), d }); try { localStorage.setItem(SK, j); } catch (e) { sessionStorage.setItem(SK, j); } } catch (e) { } }, 30000);
  // price n minutes ago from the quotes (within a tolerance)
  window.snapAt = (s, min) => { const a = SNAP[s]; if (!a || !a.length) return null; const t = Date.now() - min * 6e4, tol = Math.max(0.6, min * 0.5) * 6e4; let best = null; for (const x of a) { if (Math.abs(x[0] - t) <= tol && (!best || Math.abs(x[0] - t) < Math.abs(best[0] - t))) best = x; } return best; };
  // minute closes from the quotes (forward-filled)
  function minutes(s) { const a = SNAP[s]; if (!a || a.length < 3) return null; const now = Date.now(), n = Math.min(45, Math.floor((now - a[0][0]) / 6e4)); if (n < 15) return null; const C = []; let k = 0, last = a[0][1];
    for (let m = n; m >= 0; m--) { const t = now - m * 6e4; while (k < a.length && a[k][0] <= t) { last = a[k][1]; k++; } C.push(last); } return { c: C, h: C, l: C, v: null }; }
  // ---------- the rule ----------
  const rsd = a => { const v = a.filter(x => isFinite(x) && x !== 0).map(Math.abs).sort((x, y) => x - y); return v.length >= 8 ? v[Math.floor(v.length / 2)] * 1.4826 : NaN; };
  function detect(S, end) {   // S: {c, h, l, v}; end: index of the last closed minute
    const n = end + 1; if (n < 16) return null; const r = []; for (let i = Math.max(1, n - 120); i < n; i++) r.push(Math.log(S.c[i] / S.c[i - 1]));
    const sg = Math.max(0.0004, rsd(r) || 0); const W = Math.min(30, n - 1), a = n - W, last = S.c[end]; let best = null;
    for (const side of [-1, 1]) {   // −1 = a top (turning down), +1 = a bottom (turning up)
      let e = -1; for (let i = a; i <= end - 1; i++) if (e < 0 || (side < 0 ? S.h[i] > S.h[e] : S.l[i] < S.l[e])) e = i;
      if (e < 0 || end - e > 8 || end - e < 1) continue; const ex = side < 0 ? S.h[e] : S.l[e];
      let b = a; for (let i = a; i <= e; i++) if (side < 0 ? S.l[i] < S.l[b] : S.h[i] > S.h[b]) b = i; const base = side < 0 ? S.l[b] : S.h[b];
      const leg = Math.abs(Math.log(ex / base)), back = side < 0 ? Math.log(ex / last) : Math.log(last / ex); if (leg < Math.max(8 * sg, 0.006) || back <= 0) continue;
      const ret = back / leg; if (ret < 0.5) continue;
      let vf = 1; if (S.v) { const pre = S.v.slice(Math.max(a, b), e + 1), post = S.v.slice(e + 1, end + 1), mu = z => z.length ? z.reduce((p, q) => p + q, 0) / z.length : 0; if (mu(pre) > 0 && post.length) vf = Math.max(0.7, Math.min(1.5, mu(post) / mu(pre))); }
      const score = Math.min(1.5, ret) * Math.min(2.5, back / (4 * sg)) / 1.5 * vf;
      if (!best || score > best.score) best = { side, leg, back, ret, ago: end - e, ex, last, base, legMin: e - b, score, sg, vf }; }
    return best;
  }
  // ---------- 1-minute bars from the Worker ----------
  const BARS = {}, LIVE = {}, BT = {}; let busy = false, btT = 0;
  async function bars(t, range) { const j = await (await fetch(`${P()}/chart?t=${encodeURIComponent(t)}&range=${range}&interval=1m`)).json().catch(() => null); if (!j || j.status !== "ok") return null; const B = (j.bars || []).filter(b => b[4] != null && b[2] != null && b[3] != null); return B.length ? B : null; }
  const toS = B => ({ c: B.map(b => b[4]), h: B.map(b => b[2]), l: B.map(b => b[3]), v: B.map(b => b[5] || 0), t: B.map(b => b[0]) });
  // one reading per underlying: every fund with an underlying (single stocks, indexes, commodities, crypto) reads the
  // underlying's 1-minute bars, so the long and the inverse funds on it can never disagree (before: index funds such as
  // SOXL and SOXS each read their own bars and could show different turns and scores)
  const uT = u => /\.X$/.test(u) ? u.replace(/\.X$/, "-USD") : u, keyOf = r => r.u ? uT(r.u) : r.s;
  function targets() { const R = typeof ROWS !== "undefined" ? ROWS : [], W = typeof WATCH !== "undefined" ? WATCH : [], U = new Map();
    const add = (t, k) => { if (t && !U.has(t)) U.set(t, k); };
    R.filter(r => W.includes(r.s)).forEach(r => add(keyOf(r)));
    R.filter(r => r.kind === "stock" && r.u && r.dv >= 1e6).sort((a, b) => Math.abs(b.m5 || b.pct || 0) - Math.abs(a.m5 || a.pct || 0)).slice(0, 10).forEach(r => add(keyOf(r)));
    R.filter(r => r.kind !== "stock" && r.dv >= 5e6).sort((a, b) => b.dv - a.dv).slice(0, 6).forEach(r => add(keyOf(r)));
    return [...U.keys()].slice(0, 16); }
  // without 1-minute bars: the underlying's own quotes; if the page has no quotes for the underlying, the most traded fund
  // on it (its reading is mapped to every other fund through the sign of the leverage)
  let REF = {}, refAt = 0;
  function refOf(u) { if (Date.now() - refAt > 2e4) { refAt = Date.now(); REF = {}; (typeof ROWS !== "undefined" ? ROWS : []).forEach(r => { if (r.u && r.L && (!REF[r.u] || r.dv > REF[r.u].dv)) REF[r.u] = { s: r.s, L: r.L, dv: r.dv }; }); } return REF[u] || null; }
  async function pull() { if (busy || !P()) return; const ph = typeof phaseAt === "function" ? phaseAt(Date.now()) : "regular"; busy = true;
    try { const T = targets(); for (let k = 0; k < T.length; k += 4) await Promise.all(T.slice(k, k + 4).map(async t => { const B = await bars(t, "1d"); if (B) { BARS[t] = B; const S = toS(B); LIVE[t] = ph === "closed" ? null : detect(S, S.c.length - 2); } }));
      if (Date.now() - btT > 30 * 6e4) { btT = Date.now(); for (let k = 0; k < T.length; k += 4) await Promise.all(T.slice(k, k + 4).map(async t => { if (BT[t] && Date.now() - BT[t].at < 6 * 36e5) return; const B = await bars(t, "5d"); if (B) BT[t] = { at: Date.now(), r: backtest(B) }; })); report(); }
    } catch (e) { } busy = false; draw(); }
  // ---------- the test ----------
  function backtest(B) { const out = []; const days = new Map(); B.forEach(b => { const d = new Date(b[0] - 5 * 36e5).toISOString().slice(0, 10); if (!days.has(d)) days.set(d, []); days.get(d).push(b); });
    for (const D of days.values()) { if (D.length < 60) continue; const S = toS(D); let skip = -1;
      for (let i = 20; i < D.length - 31; i++) { if (i < skip) continue; const x = detect(S, i); if (!x || x.score < 0.6) continue; skip = i + 15; const f = h => x.side * Math.log(S.c[i + h] / S.c[i]); out.push({ s: x.score, h5: f(5), h15: f(15), h30: f(30) }); } }
    return out; }
  let SUM = null;
  function report() { const all = Object.values(BT).flatMap(x => x.r); if (!all.length) { SUM = null; return; } SUM = {};
    for (const [lab, F] of [["All turns", all], ["HARD (score 1+)", all.filter(x => x.s >= 1)]]) { SUM[lab] = {}; for (const h of ["h5", "h15", "h30"]) { const v = F.map(x => x[h]).filter(isFinite), n = v.length; if (!n) continue; const m = v.reduce((p, q) => p + q, 0) / n, s = Math.sqrt(v.reduce((p, q) => p + (q - m) ** 2, 0) / Math.max(1, n - 1)) || 1e-9; SUM[lab][h] = { n, m, w: v.filter(x => x > 0).length / n, z: m / (s / Math.sqrt(n)) }; } }
    try { if (window.Hub) Hub.report(["h5", "h15", "h30"].filter(h => SUM["All turns"][h]).map(h => ({ eng: "LETF · hard reversal", mkt: "pooled 1-min bars", rule: "turn: 8σ leg, half given back within 8 min", h: h.slice(1) + "m", n: SUM["All turns"][h].n, m: SUM["All turns"][h].m, unit: "log ret", z: SUM["All turns"][h].z, oos: true }))); } catch (e) { } }
  // ---------- every fund gets a reading (same underlying = same reading) ----------
  // called by the scanner for each row: 1-min and 5-min moves, and the reversal reading
  const QC = {};   // quote-based readings, kept for 20 s per fund (cheap)
  window.revRow = r => { const a = snapAt(r.s, 1), b = snapAt(r.s, 5); r.m1 = a && a[1] > 0 ? r.last / a[1] - 1 : NaN; r.m5 = b && b[1] > 0 ? r.last / b[1] - 1 : r.m5;
    const u = r.u || null, ut = u ? uT(u) : null; let x = null, src = "", k = 1;   // k: sign that maps the reading to this fund
    const fromQuotes = s => { const c = QC[s]; if (c && Date.now() - c.at < 2e4) return c.x; const M = minutes(s), y = M ? detect(M, M.c.length - 1) : null; QC[s] = { at: Date.now(), x: y }; return y; };
    if (u) { if (LIVE[ut]) { x = LIVE[ut]; src = u; k = Math.sign(r.L) || 1; }
      else if (!BARS[ut]) { if (SNAP[u] && SNAP[u].length >= 3) { x = fromQuotes(u); src = u + " (quotes)"; k = Math.sign(r.L) || 1; }
        else { const f = refOf(u), y = f && f.dv >= 1e5 ? fromQuotes(f.s) : null; if (y) { x = { ...y, side: y.side * (Math.sign(f.L) || 1) }; src = u + " (" + f.s + " quotes)"; k = Math.sign(r.L) || 1; } } } }
    else if (LIVE[r.s]) { x = LIVE[r.s]; src = r.s; } else if (r.dv >= 1e5 && !BARS[r.s]) { x = fromQuotes(r.s); src = r.s + " (quotes)"; }
    r.rev = x ? { ...x, dir: x.side * k, src } : null;
    const evf = window.EVR ? EVR.factor("letf", r.rev && r.rev.score >= 1 ? "rev.hard.15m" : "rev.all.15m") : 1; if (r.rev) r.rev.evf = evf;   // EV governor: a muted rule shows no flag
    if (r.rev && r.rev.score >= 0.6 && evf > 0) r.sig.unshift(["⤾", `${r.rev.score >= 1 ? "HARD " : ""}reversal ${r.rev.dir > 0 ? "up" : "down"} (${src}: leg ${pc(r.rev.leg, 1)}, ${Math.round(r.rev.ret * 100)}% given back, ${r.rev.ago} min ago)`]); };
  function readings() { return (typeof ROWS !== "undefined" ? ROWS : []).filter(r => r.rev); }
  // the EV governor's ruling (ev.json, after each US close; 7 days of 1-minute bars on 30 markets)
  const evTxt = (id, lab) => { const x = window.EVR && EVR.item("letf", id); if (!x) return ""; const fast = /^fast/.test(id), col = x.status === "mute" ? "down" : x.status === "back" ? "up" : x.status === "cut" ? "" : "";
    const what = fast ? (x.older * x.recent < 0 ? "no clear edge: the two halves of the test disagree" : x.ev > 0 ? "follow fast moves" : "fade fast moves") : x.status === "mute" ? "muted: no flags in the scanner" : x.status === "back" ? "backed" : x.status === "cut" ? "half weight" : "watch";
    // the opposite reading counts only when it holds on the older half AND on the newer half of the test (walk-forward)
    const both = x.ev < 0 && x.older < 0 && x.recent < 0 && (x.status === "mute" || x.status === "cut");
    const fade = both ? ` · <b style="color:var(--amber,#ffb547)">Opposite reading:</b> ${fast ? "after a fast move, price tended to come back" : "a turn tended to fail and the old direction came back"} (${isFinite(x.hit) ? Math.round((1 - x.hit) * 100) + "% of cases, " : ""}older half ${pc(-x.older, 2)}, newer half ${pc(-x.recent, 2)} per 15 min). Do not chase it. Not yet tested with limit entries.` : "";
    return `<div class="sub" style="font-size:11.5px;margin-top:4px">EV governor${lab ? " · " + lab : ""}: <b class="${col}">${x.status.toUpperCase()}</b> (${what}) · ${x.n} cases, next 15 min mean ${pc(x.ev, 3)}, z ${isFinite(x.z) ? x.z.toFixed(1) : "–"}, ${isFinite(x.hit) ? Math.round(x.hit * 100) + "% right" : ""}${fade}</div>`; };
  // the card: open or closed as the reader left it (before: every redraw opened it again, every 12 s)
  let OPEN = null, LASTOP = null; card.addEventListener("toggle", e => { if (e.target.tagName === "DETAILS" && e.target.open !== LASTOP) OPEN = LASTOP = e.target.open; }, true);
  function draw() {
    const R = typeof ROWS !== "undefined" ? ROWS : [], rd = readings();
    // EV governor: when the reversal rule is muted (proven negative EV), the card starts closed (one line above the
    // scanner), its turns are grey, and it says that the turn tended to fail. The page order is set by layout.js (shared).
    const mut = !!(window.EVR && EVR.item("letf", "rev.all.15m") && EVR.factor("letf", "rev.all.15m") === 0);
    const op = OPEN == null ? !mut : OPEN; LASTOP = op;
    // one line per market (underlying or fund), with its funds
    const G = new Map(); rd.filter(r => r.rev.score >= 0.6).forEach(r => { const k = r.rev.src; const g = G.get(k) || { k, x: r.rev, funds: [] }; g.funds.push(r); G.set(k, g); });
    const L = [...G.values()].sort((a, b) => b.x.score - a.x.score).slice(0, 10);
    const fundsTxt = g => { const up = g.funds.filter(f => f.rev.dir > 0).sort((a, b) => b.dv - a.dv).slice(0, 2), dn = g.funds.filter(f => f.rev.dir < 0).sort((a, b) => b.dv - a.dv).slice(0, 2); return `${up.length ? `<span class="up">▲ ${up.map(f => `<b data-f="${f.s}">${E(f.s)}</b>`).join(" ")}</span>` : ""} ${dn.length ? `<span class="down">▼ ${dn.map(f => `<b>${E(f.s)}</b>`).join(" ")}</span>` : ""}`; };
    const m1 = R.filter(r => isFinite(r.m1) && r.dv >= 1e6).sort((a, b) => Math.abs(b.m1) - Math.abs(a.m1)).slice(0, 8), m5 = R.filter(r => isFinite(r.m5) && r.dv >= 1e6).sort((a, b) => Math.abs(b.m5) - Math.abs(a.m5)).slice(0, 8);
    const mt = (A, k, lab) => `<table><tr><th class="l">${lab}</th><th>Move</th><th>Price</th></tr>${A.map(r => `<tr data-f="${r.s}"><td class="l"><b>${E(r.s)}</b> <span class="sub">${r.L > 0 ? "+" : ""}${r.L}× ${E(r.u || "")}</span></td><td class="${cl(r[k])}"><b>${pc(r[k], 1)}</b></td><td>${typeof fmtPx === "function" ? fmtPx(r.last) : r.last}</td></tr>`).join("") || `<tr><td class="l sub" colspan="3">Needs ${k === "m1" ? "1" : "5"}+ minutes of live quotes.</td></tr>`}</table>`;
    const S = SUM && SUM["All turns"], H = SUM && SUM["HARD (score 1+)"], bt = (x, lab) => x && x.h15 ? `${lab}: next 15 min kept going the new way <b class="${x.h15.w >= 0.55 ? "up" : x.h15.w < 0.45 ? "down" : ""}">${Math.round(x.h15.w * 100)}%</b> of ${x.h15.n} (mean ${pc(x.h15.m, 2)}; 5 min ${x.h5 ? Math.round(x.h5.w * 100) + "%" : "–"}, 30 min ${x.h30 ? Math.round(x.h30.w * 100) + "%" : "–"})` : "";
    card.innerHTML = `<details${op ? " open" : ""}><summary class="label" style="cursor:pointer">⤾ Hard reversal detector · and the fastest 1-minute and 5-minute moves${mut ? ` <span class="tg" style="background:var(--dim,#7a8699)">MUTED · proven negative EV</span>` : ""}</summary>
      <div class="r3"><div><div class="tw" style="overflow-x:auto"><table><tr><th class="l">Market</th><th class="l">Turn</th><th>Leg</th><th>Given back</th><th>Since</th><th>Score</th><th class="l">Funds</th></tr>
        ${L.map(g => `<tr class="${g.x.score >= 1 && !mut ? "hard" : ""}" data-f="${g.funds[0].s}"${mut ? ' style="opacity:.55"' : ""}><td class="l"><b>${E(g.k)}</b></td><td class="l"><span class="tg" style="background:${g.x.side > 0 ? "var(--up,#19d38a)" : "var(--down,#ff4d5e)"}">${g.x.score >= 1 ? "HARD " : ""}${g.x.side > 0 ? "BOTTOM ▲" : "TOP ▼"}</span></td><td>${pc(g.x.side > 0 ? -g.x.leg : g.x.leg, 1)} <span class="sub">${g.x.legMin} min</span></td><td>${Math.round(g.x.ret * 100)}%</td><td>${g.x.ago} min</td><td><b>${g.x.score.toFixed(2)}</b></td><td class="l">${fundsTxt(g)}</td></tr>`).join("") || `<tr><td class="l sub" colspan="7">${P() ? "No reversal now. A reversal = a big leg in the last 30 minutes, then half or more given back within 8 minutes." : "Add the Worker URL in Settings for 1-minute bars (the page's own quotes still work after 15 minutes)."}</td></tr>`}</table></div>
        <div class="sub" style="font-size:11.5px;margin-top:4px;line-height:1.45">${S ? `Test on the last 5 days of 1-minute bars (${Object.keys(BT).length} markets). ${bt(S, "All turns")}. ${bt(H, "HARD only")}. 50% = a coin flip.` : "The test on the last 5 days of 1-minute bars runs after the first minute."} A bottom is ▲ for long funds and ▼ for inverse funds on the same underlying. ${mut ? `<b>Muted:</b> on the EV test, trading the new direction after these turns lost money (the old direction tended to come back). Do not trade a turn from this table.` : "A reversal is a warning and a chance, not an order: wait for the next 1-minute bar to hold, and use a limit entry."}</div></div>
        <div>${mt(m1, "m1", "Fastest 1 min")}${evTxt("fast.1m.15m")}</div><div>${mt(m5, "m5", "Fastest 5 min")}${evTxt("fast.5m.15m")}</div></div>
      ${evTxt("rev.all.15m", "Reversal rule")}${evTxt("rev.hard.15m", "HARD reversals")}</details>`;
  }
  setTimeout(pull, 3000); setInterval(pull, 60000); setInterval(draw, 12000);
})();
