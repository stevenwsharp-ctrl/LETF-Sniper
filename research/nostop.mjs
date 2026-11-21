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
// LETF agent research (Nov 21 2026): plan stop against NO stop, per day, with an expanding walk-forward choice.
// Same signals, limits and fills as scripts/ev.mjs planTrades (busy = the plan-stop exit, so each plan is paired).
// Variants after the fill: plan stop, no stop, stop at k × 5-min ATR (k 2, 3). Record only: it changes nothing on the page.
const C = CLK.true;
function run(B5, BD) { const out = []; let busy = -1;
  const B = B5.filter(b => { const m = C.min(b[0]); return m >= 570 && m < 960; });
  for (let i = 400; i < B.length; i++) { const m = C.min(B[i][0]); if (![625, 685, 745, 805, 865].includes(m) || i <= busy) continue; const day = C.day(B[i][0]);
    const today = B.filter((x, k) => k <= i && C.day(x[0]) === day), bd = BD.filter(x => C.day(x[0]) < day).slice(-60);
    if (today.length) bd.push([today[0][0], today[0][1], Math.max(...today.map(x => x[2])), Math.min(...today.map(x => x[3])), today[today.length - 1][4], today.reduce((p, x) => p + x[5], 0)]);
    let S; try { S = setupCore({ b5: B.slice(i - 389, i + 1), bd }, B[i][4], null); } catch (e) { S = null; }
    if (!S || !S.side || !S.plan) continue;
    const P = S.plan, d = P.side, a5 = S.a5, full = /SETUP/.test(S.verdict);
    const end = (() => { let k = i; while (k + 1 < B.length && C.day(B[k + 1][0]) === day) k++; return k; })();
    let f = -1; for (let j = i + 1; j <= Math.min(i + 12, end); j++) if (d > 0 ? B[j][3] <= P.limit : B[j][2] >= P.limit) { f = j; break; }
    if (f < 0) { busy = Math.min(i + 12, end); continue; }
    const exitW = stop => { const stopHit = x => stop != null && (d > 0 ? x[3] <= stop : x[2] >= stop), tgtHit = x => d > 0 ? x[2] >= P.tgt : x[3] <= P.tgt;
      let px = null, why = "time", k = f; if (stopHit(B[f])) { px = stop; why = "stop"; }
      else for (k = f + 1; k <= Math.min(f + 12, end); k++) { const x = B[k]; if (stopHit(x)) { px = d > 0 ? Math.min(x[1], stop) : Math.max(x[1], stop); why = "stop"; break; } if (tgtHit(x)) { px = P.tgt; why = "tgt"; break; } }
      if (px == null) { k = Math.min(f + 12, end); px = B[k][4]; } return { v: d * Math.log(px / P.limit) - COST, why, k }; };
    const pl = exitW(P.stop), no = exitW(null), k2 = exitW(P.limit - d * 2 * a5), k3 = exitW(P.limit - d * 3 * a5);
    // worst excursion while held with no stop (as a share of the limit, underlying)
    let mae = 0; for (let q = f; q <= Math.min(f + 12, end); q++) mae = Math.min(mae, d > 0 ? B[q][3] / P.limit - 1 : 1 - B[q][2] / P.limit);
    busy = pl.k; out.push({ t: B[i][0], day, full, why: pl.why, V: { plan: pl.v, none: no.v, k2: k2.v, k3: k3.v }, mae, riskA: Math.abs(P.limit - P.stop) / a5 }); }
  return out; }
const VS = ["plan", "none", "k2", "k3"];
(async () => {
  const all = []; let got = 0;
  for (let k = 0; k < LETF_U.length; k += 3) await Promise.all(LETF_U.slice(k, k + 3).map(async s => { const [B5, BD] = await Promise.all([barsY(s, "5m", "1mo"), barsY(s, "1d", "6mo")]); if (!B5 || B5.length < 500 || !BD) return; got++; run(B5, BD).forEach(x => all.push({ ...x, s })); }));
  all.sort((x, y) => x.t - y.t); console.log("markets", got, "of", LETF_U.length, "plans", all.length);
  const f3 = x => (x * 100).toFixed(3);
  for (const kind of ["all", "full", "lean"]) { const A = all.filter(x => kind === "all" || (kind === "full") === x.full); if (!A.length) continue;
    console.log(`\n===== ${kind}: n ${A.length}`);
    const h = Math.floor(A.length / 2);
    for (const w of VS) { const v = A.map(x => x.V[w]); console.log(w.padEnd(5), "mean", f3(mean(v)), "older", f3(mean(v.slice(0, h))), "newer", f3(mean(v.slice(h))), "z", (mean(v) / (sd(v) / Math.sqrt(v.length))).toFixed(2)); }
    const dif = A.map(x => x.V.none - x.V.plan); console.log("paired none − plan: mean", f3(mean(dif)), "z(plan)", (mean(dif) / (sd(dif) / Math.sqrt(dif.length))).toFixed(2));
    const days = [...new Set(A.map(x => x.day))].sort(), dm = days.map(d => { const a = A.filter(x => x.day === d); return { d, n: a.length, M: Object.fromEntries(VS.map(w => [w, mean(a.map(x => x.V[w]))])), S: Object.fromEntries(VS.map(w => [w, a.reduce((p, x) => p + x.V[w], 0)])) }; });
    const dd = dm.map(x => (x.S.none - x.S.plan) / x.n); console.log("day-clustered none − plan: days", dd.length, "days none better", dd.filter(x => x > 0).length, "z(day)", (mean(dd) / (sd(dd) / Math.sqrt(dd.length))).toFixed(2));
    console.log("day | n | plan | none | k2 | k3 (mean % per plan)"); dm.forEach(x => console.log(x.d, x.n, ...VS.map(w => f3(x.M[w]))));
    // expanding walk-forward: from day 6, pick the variant with the best total on all EARLIER days; score it on this day only
    const pick = {}, sc = { wf: [], plan: [], none: [] };
    for (let i = 5; i < dm.length; i++) { const tot = Object.fromEntries(VS.map(w => [w, dm.slice(0, i).reduce((p, x) => p + x.S[w], 0)])); const best = VS.slice().sort((a, b) => tot[b] - tot[a])[0]; pick[dm[i].d] = best;
      const a = A.filter(x => x.day === dm[i].d); a.forEach(x => { sc.wf.push(x.V[best]); sc.plan.push(x.V.plan); sc.none.push(x.V.none); }); }
    console.log("walk-forward picks:", Object.entries(pick).map(([d, w]) => d.slice(5) + ":" + w).join(" "));
    console.log("walk-forward test days: n", sc.wf.length, "picked", f3(mean(sc.wf)), "always plan stop", f3(mean(sc.plan)), "always no stop", f3(mean(sc.none)));
    const S = A.filter(x => x.why === "stop"); console.log("plan-stop exits", S.length, "their mean with the stop", f3(mean(S.map(x => x.V.plan))), "held with no stop", f3(mean(S.map(x => x.V.none))), "with k3", f3(mean(S.map(x => x.V.k3))));
    const mae = A.map(x => x.mae).sort((a, b) => a - b); console.log("no-stop worst excursion (underlying) q01", f3(mae[Math.floor(.01 * mae.length)]), "q05", f3(mae[Math.floor(.05 * mae.length)]), "min", f3(mae[0]));
    const nv = A.map(x => x.V.none).sort((a, b) => a - b), pv = A.map(x => x.V.plan).sort((a, b) => a - b); console.log("worst plan result: plan stop", f3(pv[0]), "q05", f3(pv[Math.floor(.05 * pv.length)]), "| no stop", f3(nv[0]), "q05", f3(nv[Math.floor(.05 * nv.length)]));
  }
})();
