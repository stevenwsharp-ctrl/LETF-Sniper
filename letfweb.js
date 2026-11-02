/* LETF Sniper · the spider web (web.js, shared in this browser with SOXX Sniper and Cohort Sniper).
   Signals, one set per underlying asset (all its funds are one bet), sent under the most traded LONG fund on it:
   - letf.crowd   $ traded today in bull funds vs bear funds of the same asset: where leveraged retail is leaning
   - letf.gap     that fund vs its implied move (a premium or discount to its own target)
   - letf.setup   the level-to-level setup read from the underlying's chart (when a fund on it is open)
   The web scores each against what the fund did next and learns whether to follow or fade it.
   Graphics: the web on the scanner page, and its forecast on each fund page. Uses: UNI, ROWS, QT, curF, setupOf, Web. */
(function () {
  "use strict";
  if (!window.Web) return;
  const c1 = v => Math.max(-1, Math.min(1, v));
  Web.addPrice(a => { try { const q = QT[a]; return q && q[0] > 0 ? q[0] : null; } catch (e) { return null; } });
  const rep = {};   // underlying -> its most traded long fund
  function feed() {
    if (document.hidden || typeof ROWS === "undefined" || !ROWS.length) return;
    const G = {}; ROWS.forEach(r => { if (!r.u || !r.L || !(r.dv > 0)) return; (G[r.u] = G[r.u] || []).push(r); });
    Object.entries(G).map(([u, L]) => [u, L, L.reduce((s, r) => s + r.dv, 0)]).sort((a, b) => b[2] - a[2]).slice(0, 60).forEach(([u, L, tot]) => {
      const longs = L.filter(r => r.L > 0).sort((a, b) => b.dv - a.dv); if (!longs.length) return; const R = longs[0]; rep[u] = R.s;
      const bull = L.filter(r => r.L > 0).reduce((s, r) => s + r.dv * Math.abs(r.L), 0), bear = L.filter(r => r.L < 0).reduce((s, r) => s + r.dv * Math.abs(r.L), 0);
      if (bull + bear >= 2e6 && bear > 0) Web.emit("letf.crowd", R.s, c1((bull - bear) / (bull + bear)), "LETF · leveraged money in bull vs bear funds of the same asset");
      if (isFinite(R.gap) && Math.abs(R.gap) >= 0.003) Web.emit("letf.gap", R.s, c1(R.gap / 0.01), "LETF · fund vs its implied move (premium +)");
    });
    try { if (typeof curF !== "undefined" && curF) { const f = UMAP[curF] || {}, S = setupOf(curF); if (S && S.U && rep[f.u]) { if (S.U.side) Web.emit("letf.setup", rep[f.u], S.U.side * 0.6, "LETF · level-to-level setup on the underlying's chart"); } } } catch (e) { }
    draw();
  }
  // graphics
  const main = document.getElementById("scanCard"); let wc = null;
  if (main) { wc = document.createElement("section"); wc.className = "card"; wc.id = "webCard"; wc.style.marginBottom = "12px";
    wc.innerHTML = `<details open><summary class="label" style="cursor:pointer">🕸 Spider web · every signal on LETF Sniper, SOXX Sniper and Cohort Sniper, and how they link (shared in this browser)</summary><div id="webMain" style="margin-top:8px"></div><div class="sub" style="margin-top:6px;font-size:12px">LETF Sniper adds three signals per underlying asset: leveraged money in bull vs bear funds (crowd lean), the fund's premium or discount to its implied move, and the level-to-level setup read from the asset's own chart. Every 30 minutes the web takes a snapshot; it scores it after 30 minutes, 1, 4 and 24 hours and learns which signals lead, which to fade, and which links matter.</div></details>`;
    main.after(wc); }
  const under = document.getElementById("fvUnder"); let fc = null;
  if (under) { fc = document.createElement("div"); fc.id = "fvWeb"; fc.style.marginTop = "10px"; under.closest(".card").appendChild(fc); }
  let wT = 0;
  function draw() {
    try { if (wc && document.getElementById("mainView").style.display !== "none" && wc.querySelector("details").open && Date.now() - wT > 55e3) { wT = Date.now(); Web.render(document.getElementById("webMain"), { h: 420, working: true }); } } catch (e) { }
    try { if (fc && typeof curF !== "undefined" && curF) { const f = UMAP[curF] || {}, a = rep[f.u] || curF, h = Web.forecastHtml(a); fc.innerHTML = h ? `<div class="label" style="margin:6px 0 4px">🕸 Signal web on $${f.u || curF} (via $${a})</div>${h}` : `<div class="sub" style="font-size:12px">🕸 The signal web has no forecast for $${f.u || curF} yet: it starts learning this asset now.</div>`; } } catch (e) { }
  }
  setTimeout(feed, 20000); setInterval(feed, 60000);
  // knowledge hub: a card under the web, and test-runner tasks: the engines on the 25 most traded underlyings (2 years of daily bars)
  try { if (window.Hub) { Hub.card(wc || document.getElementById("scanCard"), "hubCard");
    setTimeout(() => { const G = {}; (ROWS || []).forEach(r => { if (r.u && r.dv > 0) G[r.u] = (G[r.u] || 0) + r.dv; });
      Object.entries(G).sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([u]) => Hub.task("LETF · engines on " + u, async () => { const j = await getChart(/\.X$/.test(u) ? u.replace(/\.X$/, "-USD") : u, "2y", "1d"); return j.bars && j.bars.length >= 400 ? Hub.battery(j.bars.map(b => [b[0], b[1], b[2], b[3], b[4], b[5] || 0]), u, { daily: true }) : null; })); }, 40000); } } catch (e) { }
  document.addEventListener("click", () => setTimeout(draw, 300));
})();
