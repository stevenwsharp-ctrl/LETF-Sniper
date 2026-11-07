/* LETF Sniper · what worked this week on 2× and 3× funds. Reads the paper bots' record from SOXX Sniper (bots.json on
   its "bots" branch: every signal on 26 leveraged funds traded on paper by 15 versions, last 7 market days, 1-minute bars)
   and shows, at the top of the page:
   - a time line: is now a half hour in which 2×/3× entries clearly lost? (the same gate the bots use)
   - each entry idea's record on 2×/3× funds, and which scanner tab it matches, so a tab is not read as a buy list
   - the lesson from Cohort Sniper's weekly review: entries after the move is done lose, pull-backs win
   Refreshes every 10 minutes. */
(function () {
  "use strict";
  if (window.LESSONS) return; window.LESSONS = 1;
  const URL = "https://raw.githubusercontent.com/stevenwsharp-ctrl/SOXX-Sniper/bots/bots.json";
  const host = document.getElementById("scanCard"); if (!host) return;
  const card = document.createElement("section"); card.className = "card"; card.id = "lessonCard"; card.style.marginBottom = "12px";
  host.parentElement.insertBefore(card, document.getElementById("revCard") || host);
  const st = document.createElement("style");
  st.textContent = `#lessonCard table{width:100%;border-collapse:collapse;font:12px var(--mono,monospace)}#lessonCard th,#lessonCard td{padding:3px 6px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}#lessonCard th{color:var(--faint);font-weight:600}#lessonCard .l{text-align:left}#lessonCard .g2{display:grid;grid-template-columns:1fr;gap:6px}#lessonCard .now{padding:7px 10px;border-radius:8px;margin:6px 0;font-weight:600}#lessonCard .bad{background:rgba(255,77,94,.12);border:1px solid rgba(255,77,94,.45)}#lessonCard .ok{background:rgba(24,150,112,.10);border:1px solid rgba(24,150,112,.4)}#lessonCard .sub{color:var(--faint);font-size:11.5px;line-height:1.45}`;
  document.head.appendChild(st);
  const E = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const bp = m => m == null ? "–" : (m >= 0 ? "+" : "") + (m * 100).toFixed(2) + "%";
  const pc = w => w == null ? "–" : Math.round(w * 100) + "%";
  const TAB = { brk: "At day high", mom: "Momentum 15m · Fast 1m/5m", pull: "Top gainers (dip in an up-trend)", vrev: "Top losers · Reversals (bottom)", rsi: "Top losers (oversold)", sqz: "Volume surge (after a quiet range)" };
  const ET = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "numeric", hourCycle: "h23", weekday: "short" });
  const nowB = () => { const p = Object.fromEntries(ET.formatToParts(new Date()).map(x => [x.type, x.value])), m = +p.hour * 60 + +p.minute; return { wd: p.weekday, m, b: m >= 570 && m < 960 ? Math.floor((m - 570) / 30) : null }; };
  let R = null, err = "";
  function ideas(cl) {   // each idea's record, all 15 versions together (paper trades, last 7 market days)
    const g = {}; (R.arms || []).filter(a => a.cl === cl).forEach(a => { const z = g[a.idea] || (g[a.idea] = { n: 0, s: 0, w: 0 }); z.n += a.n; z.s += a.m * a.n; z.w += a.w * a.n; });
    return Object.keys(R.ideas || {}).filter(k => g[k] && g[k].n).map(k => ({ k, name: R.ideas[k], n: g[k].n, m: g[k].s / g[k].n, w: g[k].w / g[k].n, off: ((R.gates && R.gates.ideas && R.gates.ideas[cl]) || []).includes(k) })).sort((a, b) => b.m - a.m);
  }
  function draw() {
    if (!R) { card.innerHTML = `<div class="label">What worked this week · 2× and 3× funds</div><div class="sub">${err ? "Could not load the bots' record (" + E(err) + ")." : "Loading the paper bots' record…"}</div>`; return; }
    const T = (R.times && R.times.L) || [], G = (R.gates && R.gates.times && R.gates.times.L) || [], N = nowB();
    let line = "";
    if (N.b != null && !["Sat", "Sun"].includes(N.wd)) { const x = T[N.b], bad = x && G.includes(x.name);
      line = x ? `<div class="now ${bad ? "bad" : "ok"}">${bad ? "⚠ Weak half hour for 2×/3× entries" : "✓ Normal half hour"} (${E(x.name)} ET): paper trades started now ${bp(x.m)} on average, ${pc(x.w)} won (${x.n.toLocaleString()} trades).${bad ? " Wait, or use a smaller size." : ""}</div>` : ""; }
    const best = T.filter(x => x.n >= 200).slice().sort((a, b) => b.m - a.m).slice(0, 2).map(x => x.name).join(" and ");
    const I = ideas("L");
    const rows = I.map(x => `<tr><td class="l">${E(x.name)}</td><td class="l sub">${E(TAB[x.k] || "")}</td><td>${x.n.toLocaleString()}</td><td>${pc(x.w)}</td><td class="${x.m >= 0 ? "up" : "down"}"><b>${bp(x.m)}</b></td><td>${x.off ? '<b class="down">off</b>' : '<b class="up">on</b>'}</td></tr>`).join("");
    const tt = T.map(x => `<tr><td class="l">${E(x.name)}</td><td>${x.n ? x.n.toLocaleString() : "–"}</td><td>${pc(x.w)}</td><td class="${x.m >= 0 ? "up" : "down"}">${bp(x.m)}</td><td>${G.includes(x.name) ? '<b class="down">weak</b>' : ""}</td></tr>`).join("");
    const age = R.at ? Math.round((Date.now() - R.at) / 36e5) : null;
    card.innerHTML = `<div class="toolbar" style="margin:0 0 4px"><div class="label" style="margin:0">What worked this week · 2× and 3× funds</div><span class="sub">paper bots (SOXX Sniper), 1-minute bars, last 7 market days${age != null ? ` · updated ${age < 1 ? "<1" : age} h ago` : ""}</span></div>
      ${line}
      <div class="sub" style="margin:4px 0 8px"><b>Do not chase.</b> Entries after the move is done lost this week: volume bursts and day-high breakouts on 2×/3× funds lost money. In Cohort Sniper, setups where price had already moved 2%+ the right way won only 35% at 24h; after a 2% pull-back they won 75%. Place the limit order on the pull-back, not at the high.${best ? ` Best half hours for 2×/3× entries: ${E(best)} ET.` : ""}</div>
      <div class="g2"><div style="overflow:auto"><table><tr><th class="l">Entry idea</th><th class="l">Scanner tab like it</th><th>Paper trades</th><th>Won</th><th>Avg / trade</th><th>Bots</th></tr>${rows}</table></div>
      <details><summary class="sub" style="cursor:pointer">By half hour (ET)</summary><div style="overflow:auto"><table><tr><th class="l">Time</th><th>Trades</th><th>Won</th><th>Avg</th><th></th></tr>${tt}</table></div></details></div>
      <div class="sub" style="margin-top:6px">"Avg / trade" = mean result of a 5–30 minute paper trade with a limit entry, after costs. "off" = the bots skip this idea now because its record clearly loses; it turns on again when the record turns. Not advice.</div>`;
  }
  async function load() { try { const r = await fetch(URL + "?t=" + Math.floor(Date.now() / 6e5), { cache: "no-store" }); if (!r.ok) throw new Error("HTTP " + r.status); R = await r.json(); err = ""; } catch (e) { err = e.message; } draw(); }
  draw(); load(); setInterval(load, 10 * 6e4); setInterval(draw, 6e4);
})();
