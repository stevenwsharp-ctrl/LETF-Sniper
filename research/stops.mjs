// LETF agent research (Nov 14 2026, council task 1): why do the fund-page plan stop exits lose?
// Same engine as Hyperdash-Cohort-Tracker scripts/ev.mjs planTrades (page setupCore read from index.html),
// with exit variants. Walk-forward: a variant is chosen on the OLDER half of the plan days, reported on the NEWER half.
// Record only: it changes nothing on the page.
import fs from "fs"; import vm from "vm";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mean = a => a.length ? a.reduce((p, q) => p + q, 0) / a.length : NaN, sd = a => { const m = mean(a); return Math.sqrt(a.reduce((p, q) => p + (q - m) ** 2, 0) / Math.max(1, a.length - 1)); };
let YC = null; async function ysess() { if (YC) return YC; try { const r = await fetch("https://fc.yahoo.com/", { headers: { "user-agent": UA }, redirect: "manual" }); const ck = (r.headers.getSetCookie ? r.headers.getSetCookie() : []).map(x => x.split(";")[0]).join("; "); const c = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", { headers: { "user-agent": UA, cookie: ck } }); YC = { ck, crumb: c.ok ? (await c.text()).trim() : "" }; } catch (e) { YC = { ck: "", crumb: "" }; } return YC; }
function syn(interval) { let x = 100, r = 7; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647; const B = []; const step = interval === "5m" ? 3e5 : 864e5; const t0 = Date.UTC(2026, 9, 14, 13, 30);
  for (let d = 0; d < (interval === "5m" ? 22 : 120); d++) for (let k = 0; k < (interval === "5m" ? 78 : 1); k++) { const t = t0 + d * 864e5 + k * step; const o = x; x *= 1 + (rnd() - 0.5) * 0.006; B.push([t, o, Math.max(o, x) * 1.001, Math.min(o, x) * 0.999, x, 1000 + rnd() * 1000]); } return B; }
async function barsY(sym, interval, range) { if (process.env.SYN) return syn(interval); const Y = await ysess(); for (let i = 0; i < 3; i++) { try { const r = await fetch(`https://query${i % 2 ? 2 : 1}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}&includePrePost=false${Y.crumb ? "&crumb=" + encodeURIComponent(Y.crumb) : ""}`, { headers: { "user-agent": UA, ...(Y.ck ? { cookie: Y.ck } : {}) } }); if (!r.ok) throw new Error(r.status); const j = await r.json(), x = j.chart.result[0], q = x.indicators.quote[0]; const B = []; x.timestamp.forEach((t, k) => { if ([q.open[k], q.high[k], q.low[k], q.close[k]].every(v => v > 0)) B.push([t * 1000, q.open[k], q.high[k], q.low[k], q.close[k], q.volume[k] || 0]); }); return B; } catch (e) { await sleep(1500 * (i + 1)); } } return null; }
const H = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const a = H.indexOf("function resample("), b0 = H.indexOf("function setupCore("), b = H.indexOf("\n}\n", b0);
const helper = n => { const m = new RegExp(`^const ${n}=.*$`, "m").exec(H); return m ? m[0] : ""; };
const src = ["fmtPx", "clamp", "isNum", "mean"].map(helper).join("\n") + "\nconst UMAP={},UNI=[],QT={};\n" + H.slice(a, b + 2) + "\nthis.setupCore=setupCore;";
const ctx = { console, Math, Date, Infinity, NaN, isFinite }; vm.createContext(ctx); vm.runInContext(src, ctx); const setupCore = ctx.setupCore;
const LETF_U = ["SOXX", "QQQ", "SPY", "IWM", "XBI", "NVDA", "TSLA", "MSTR", "COIN", "PLTR", "AMD", "SMCI", "AXTI", "BE", "HOOD", "OKLO", "IONQ", "RGTI", "APLD", "IREN", "CRWV", "NBIS", "MU", "AVGO"];
const COST = 0.0002;
// two clocks: "ev" = the fixed UTC−5 clock of ev.mjs; "true" = real New York time (EDT before Nov 1 2026)
const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour12: false, hour: "2-digit", minute: "2-digit", year: "numeric", month: "2-digit", day: "2-digit" });
const nyParts = t => { const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map(x => [x.type, x.value])); return { min: (+p.hour % 24) * 60 + +p.minute, day: `${p.year}-${p.month}-${p.day}` }; };
const CLK = { ev: { min: t => { const d = new Date(t - 5 * 36e5); return d.getUTCHours() * 60 + d.getUTCMinutes(); }, day: t => new Date(t - 5 * 36e5).toISOString().slice(0, 10) }, true: { min: t => nyParts(t).min, day: t => nyParts(t).day } };
// variants of the exit after the fill; signal, limit and fill are the page plan's
// stop: "plan" | "none" | number k (stop at limit ∓ k × 5-min ATR); minR: skip plans with |limit − stop| < minR × ATR
function run(B5, BD, clk, V, cacheS) { const out = []; let busy = -1; const C = CLK[clk];
  const B = B5.filter(b => { const m = C.min(b[0]); return m >= 570 && m < 960; });
  for (let i = 400; i < B.length; i++) { const m = C.min(B[i][0]); if (![625, 685, 745, 805, 865].includes(m) || i <= busy) continue; const day = C.day(B[i][0]);
    const key = clk + i; let S = cacheS.get(key);
    if (S === undefined) { const today = B.filter((x, k) => k <= i && C.day(x[0]) === day), bd = BD.filter(x => C.day(x[0]) < day).slice(-60);
      if (today.length) bd.push([today[0][0], today[0][1], Math.max(...today.map(x => x[2])), Math.min(...today.map(x => x[3])), today[today.length - 1][4], today.reduce((p, x) => p + x[5], 0)]);
      try { S = setupCore({ b5: B.slice(i - 389, i + 1), bd }, B[i][4], null); } catch (e) { S = null; } cacheS.set(key, S); }
    if (!S || !S.side || !S.plan) continue;
    const P = S.plan, d = P.side, a5 = S.a5, riskA = Math.abs(P.limit - P.stop) / a5, rewA = Math.abs(P.tgt - P.limit) / a5, full = /SETUP/.test(S.verdict);
    if (V.only && V.only !== (full ? "full" : "lean")) continue;
    if (V.minR && riskA < V.minR) continue;
    if (V.maxR && riskA > V.maxR) continue;
    const end = (() => { let k = i; while (k + 1 < B.length && C.day(B[k + 1][0]) === day) k++; return k; })();
    let f = -1; for (let j = i + 1; j <= Math.min(i + 12, end); j++) if (d > 0 ? B[j][3] <= P.limit : B[j][2] >= P.limit) { f = j; break; }
    if (f < 0) { busy = Math.min(i + 12, end); continue; }
    const stop = V.stop === "plan" ? P.stop : V.stop === "none" ? null : P.limit - d * V.stop * a5;
    let px = null, why = "time", k = f; const stopHit = x => stop != null && (d > 0 ? x[3] <= stop : x[2] >= stop), tgtHit = x => d > 0 ? x[2] >= P.tgt : x[3] <= P.tgt;
    let mae = 0, mfe = 0; const exc = x => { mae = Math.min(mae, d > 0 ? x[3] / P.limit - 1 : 1 - x[2] / P.limit); mfe = Math.max(mfe, d > 0 ? x[2] / P.limit - 1 : 1 - x[3] / P.limit); };
    exc(B[f]); const onFill = stopHit(B[f]);
    if (onFill) { px = stop; why = "stop"; }
    else for (k = f + 1; k <= Math.min(f + 12, end); k++) { const x = B[k]; exc(x);
      if (stopHit(x)) { px = d > 0 ? Math.min(x[1], stop) : Math.max(x[1], stop); why = "stop"; break; }
      if (tgtHit(x)) { px = P.tgt; why = "tgt"; break; } }
    if (px == null) { k = Math.min(f + 12, end); px = B[k][4]; }
    busy = k; out.push({ t: B[i][0], day, v: d * Math.log(px / P.limit) - COST, why, full, riskA, rewA, onFill, mae, mfe, fb: f - i, a5p: a5 / P.limit, fallback: Math.abs(P.limit - (P.now - d * 0.5 * a5)) > 1e-9 * P.now });
  } return out; }
const st = a => { const v = a.map(x => x.v); return { n: v.length, m: +(mean(v) * 100).toFixed(3), z: +(mean(v) / ((sd(v) || 1e-9) / Math.sqrt(v.length || 1))).toFixed(2) }; };
const byExit = a => Object.fromEntries(["tgt", "stop", "time"].map(w => [w, st(a.filter(x => x.why === w))]));
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? +s[Math.floor(p * (s.length - 1))].toFixed(2) : null; };
(async () => {
  const D = {}; for (let k = 0; k < LETF_U.length; k += 3) await Promise.all(LETF_U.slice(k, k + 3).map(async s => { const [B5, BD] = await Promise.all([barsY(s, "5m", "1mo"), barsY(s, "1d", "6mo")]); if (B5 && B5.length >= 500 && BD) D[s] = { B5, BD, cache: new Map() }; }));
  console.log("markets", Object.keys(D).length, "of", LETF_U.length);
  const all = (clk, V) => { const o = []; for (const s in D) run(D[s].B5, D[s].BD, clk, V, D[s].cache).forEach(x => o.push({ ...x, s })); return o.sort((x, y) => x.t - y.t); };
  for (const clk of ["ev", "true"]) {
    const base = all(clk, { stop: "plan" }); const days = [...new Set(base.map(x => x.day))].sort(), cut = days[Math.floor(days.length / 2)];
    console.log(`\n=== clock ${clk}: days ${days[0]} … ${days[days.length - 1]} (${days.length}), newer half from ${cut}`);
    console.log("base all", JSON.stringify(st(base)), "byExit", JSON.stringify(byExit(base)), "full", JSON.stringify(st(base.filter(x => x.full))), "lean", JSON.stringify(st(base.filter(x => !x.full))));
    const S = base.filter(x => x.why === "stop"), O = base.filter(x => x.why !== "stop");
    console.log("stop exits: n", S.length, "on the fill bar", S.filter(x => x.onFill).length, "risk ATR q25/50/75", q(S.map(x => x.riskA), .25), q(S.map(x => x.riskA), .5), q(S.map(x => x.riskA), .75), "| other exits risk ATR q25/50/75", q(O.map(x => x.riskA), .25), q(O.map(x => x.riskA), .5), q(O.map(x => x.riskA), .75));
    console.log("stop exits: loss % q25/50/75", q(S.map(x => x.v * 100), .25), q(S.map(x => x.v * 100), .5), q(S.map(x => x.v * 100), .75), "ATR % of price q50", q(S.map(x => x.a5p * 100), .5), "limit fallback (lim=(last+stop)/2)", S.filter(x => x.fallback).length, "| reward ATR q50 stop", q(S.map(x => x.rewA), .5), "other", q(O.map(x => x.rewA), .5));
    for (const [lo, hi] of [[0, 1], [1, 2], [2, 3], [3, 5], [5, 99]]) { const g = base.filter(x => x.riskA >= lo && x.riskA < hi); console.log(`risk ${lo}-${hi} ATR`, JSON.stringify(st(g)), "stop share", g.length ? +(g.filter(x => x.why === "stop").length / g.length).toFixed(2) : null, "older", JSON.stringify(st(g.filter(x => x.day < cut))), "newer", JSON.stringify(st(g.filter(x => x.day >= cut)))); }
    const VARS = { plan: { stop: "plan" }, none: { stop: "none" }, k1: { stop: 1 }, k1_5: { stop: 1.5 }, k2: { stop: 2 }, k3: { stop: 3 }, minR1: { stop: "plan", minR: 1 }, minR1_5: { stop: "plan", minR: 1.5 }, minR2: { stop: "plan", minR: 2 }, maxR3: { stop: "plan", maxR: 3 }, maxR5: { stop: "plan", maxR: 5 } };
    for (const only of [null, "full", "lean"]) { const res = {};
      for (const [id, V] of Object.entries(VARS)) { const r = all(clk, { ...V, only }); res[id] = { older: st(r.filter(x => x.day < cut)), newer: st(r.filter(x => x.day >= cut)), byExit: byExit(r) }; }
      const pick = Object.entries(res).filter(([, r]) => r.older.n >= 30).sort((x, y) => y[1].older.m - x[1].older.m)[0];
      console.log(`--- ${only || "all"} plans (clock ${clk}); variant: older | newer`);
      for (const [id, r] of Object.entries(res)) console.log(id.padEnd(8), JSON.stringify(r.older), "|", JSON.stringify(r.newer), id === "plan" || id === "none" ? "stop exits " + JSON.stringify(r.byExit.stop) : "");
      console.log(`WALK-FORWARD ${only || "all"} (${clk}): chosen on older = ${pick[0]} (older ${pick[1].older.m}%), newer ${pick[1].newer.m}% n ${pick[1].newer.n} vs plan newer ${res.plan.newer.m}% n ${res.plan.newer.n}`); }
  }
})();
