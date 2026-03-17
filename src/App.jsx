import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
 
// ── Rollins brand colors ──────────────────────────────────────────────
const R = {
  crimson:  "#C0392B",
  deep:     "#8B0000",
  bright:   "#E53935",
  blush:    "#FFEBEE",
  rose:     "#FFCDD2",
  white:    "#FFFFFF",
  offwhite: "#FFF5F5",
  gray:     "#6B7280",
  darkgray: "#374151",
  black:    "#111827",
};
 
function Slider({ label, value, min, max, step, fmt, onChange, sub }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div style={{ marginBottom: "1.3rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.65rem", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "1.05rem", color: "#111827", fontWeight: 700 }}>{fmt(value)}</span>
      </div>
      {sub && <div style={{ fontSize: "0.6rem", color: "#9CA3AF", fontStyle: "italic", marginBottom: "5px" }}>{sub}</div>}
      <div style={{ position: "relative", height: "5px", background: R.rose, borderRadius: "3px" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${R.deep}, ${R.bright})`, borderRadius: "3px" }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}
          style={{ position: "absolute", top: "-8px", left: 0, width: "100%", opacity: 0, cursor: "pointer", height: "22px", margin: 0 }} />
        <div style={{ position: "absolute", top: "-5px", left: `calc(${pct}% - 7px)`, width: "15px", height: "15px", borderRadius: "50%", background: R.crimson, boxShadow: `0 0 6px ${R.crimson}99`, pointerEvents: "none" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.6rem", color: "#9CA3AF", fontWeight: 500 }}>{fmt(min)}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.6rem", color: "#9CA3AF", fontWeight: 500 }}>{fmt(max)}</span>
      </div>
    </div>
  );
}
 
// ── DCF engine (5-year) ────────────────────────────────────────────────
function calcDCF(fcf, growth, tg, wacc, shares, netDebt) {
  const g = growth / 100, w = wacc / 100, t = tg / 100;
  let pvSum = 0;
  const flows = [];
  for (let y = 1; y <= 5; y++) {
    const projected = fcf * Math.pow(1 + g, y);
    const pv = projected / Math.pow(1 + w, y);
    flows.push({ year: `${2025 + y}E`, projected, pv });
    pvSum += pv;
  }
  const fcf5 = fcf * Math.pow(1 + g, 5);
  const tv = (fcf5 * (1 + t)) / (w - t) / Math.pow(1 + w, 5);
  const ev = pvSum + tv;
  const equity = ev - netDebt;
  const price = equity / shares;
  return { flows, pvSum, tv, ev, equity, price };
}
 
// ── Sensitivity heatmap cell color — high contrast 6-step scale ───────
function heatColor(val, _min, _max, market) {
  if (val >= market * 1.20) return { bg: "#004D1A", color: "#A8F0C0" };  // deep forest — strong upside
  if (val >= market * 1.08) return { bg: "#1B7F3A", color: "#E8F8EE" };  // medium green
  if (val >= market * 0.98) return { bg: "#4CAF50", color: "#FFFFFF" };  // bright green — near fair value
  if (val >= market * 0.88) return { bg: "#F4C430", color: "#1A1A00" };  // saturated amber — caution
  if (val >= market * 0.75) return { bg: "#D84315", color: "#FFE8E0" };  // burnt orange — below market
  return                           { bg: "#7B0000", color: "#FFCCCC" };  // deep maroon — significantly below
}
 
const fmtP  = v => `$${v.toFixed(2)}`;
const fmtPct = v => `${v.toFixed(1)}%`;
const fmtB  = v => v >= 1000 ? `$${(v/1000).toFixed(1)}B` : `$${v.toFixed(0)}M`;
 
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: R.deep, border: `1px solid ${R.crimson}`, borderRadius: 6, padding: "8px 12px" }}>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.7rem", color: R.rose, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.72rem", color: "#fff" }}>
          {p.name}: {fmtB(p.value)}
        </div>
      ))}
    </div>
  );
};
 
export default function RollinsDCF() {
  // Rollins actual data defaults
  const [fcf,        setFcf]        = useState(650);
  const [growth,     setGrowth]     = useState(12);
  const [tg,         setTg]         = useState(4);
  const [wacc,       setWacc]       = useState(7.34);
  const [shares,     setShares]     = useState(481.19);
  const [netDebt,    setNetDebt]    = useState(95.5);
  const [mktPrice,   setMktPrice]   = useState(57.57);
  const [activeTab,  setActiveTab]  = useState("dcf"); // dcf | sensitivity | insights
 
  const res = useMemo(() => calcDCF(fcf, growth, tg, wacc, shares, netDebt),
    [fcf, growth, tg, wacc, shares, netDebt]);
 
  const upside  = ((res.price - mktPrice) / mktPrice) * 100;
  const mos     = ((res.price - mktPrice) / res.price) * 100;
  const isUnder = res.price > mktPrice;
 
  // Sensitivity table: WACC rows × Terminal Growth cols
  const waccRange = [5.5, 6.0, 6.5, 7.0, 7.34, 7.5, 8.0, 8.5, 9.0];
  const tgRange   = [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
  const sensitivityGrid = waccRange.map(w =>
    tgRange.map(t => calcDCF(fcf, growth, t, w, shares, netDebt).price)
  );
  const allVals = sensitivityGrid.flat();
  const sMin = Math.min(...allVals), sMax = Math.max(...allVals);
 
  const chartData = [
    ...res.flows.map(f => ({ year: f.year, "PV of FCF": parseFloat(f.pv.toFixed(1)) })),
    { year: "Terminal", "Terminal Value": parseFloat(res.tv.toFixed(1)) }
  ];
 
  const statCard = (label, value, color, sub) => (
    <div style={{ background: R.white, border: `1px solid ${R.rose}`, borderRadius: 10, padding: "1rem", textAlign: "center", boxShadow: "0 1px 4px rgba(192,57,43,0.08)" }}>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.58rem", color: R.gray, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", fontWeight: 900, color: "#111827", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.6rem", color: color, marginTop: 5, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
 
  return (
    <div style={{ minHeight: "100vh", background: R.offwhite, fontFamily: "Georgia, serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet" />
 
      {/* ── Header ── */}
      <div style={{ background: R.deep, padding: "1.25rem 2rem", borderBottom: `3px solid ${R.crimson}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ width: 36, height: 36, background: R.crimson, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", fontWeight: 900, color: "#fff", fontFamily: "'DM Mono',monospace" }}>R</div>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", fontWeight: 900, color: "#fff", margin: 0 }}>Rollins, Inc. (ROL) — DCF Valuation</h1>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.62rem", color: R.rose, letterSpacing: "0.1em", marginTop: 2 }}>5-YEAR DISCOUNTED CASH FLOW · FY2025 BASE · MARCH 2026</div>
          </div>
        </div>
      </div>
 
      {/* ── Tab bar ── */}
      <div style={{ background: R.white, borderBottom: `1px solid ${R.rose}`, display: "flex", padding: "0 2rem" }}>
        {[["dcf","DCF Calculator"],["sensitivity","Sensitivity Heatmap"],["insights","Key Insights"]].map(([id,label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", padding: "0.75rem 1.25rem", border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === id ? `3px solid ${R.crimson}` : "3px solid transparent", color: activeTab === id ? R.crimson : R.gray, fontWeight: activeTab === id ? 700 : 400, transition: "all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>
 
      {/* ══ DCF TAB ══════════════════════════════════════════════════════ */}
      {activeTab === "dcf" && (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", minHeight: "calc(100vh - 120px)" }}>
 
          {/* Left — Sliders */}
          <div style={{ background: R.white, borderRight: `1px solid ${R.rose}`, padding: "1.5rem", overflowY: "auto" }}>
            <div style={{ background: R.deep, borderRadius: 8, padding: "0.6rem 0.9rem", marginBottom: "1.25rem" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.6rem", color: R.rose, letterSpacing: "0.1em" }}>ROLLINS INC · ROL · PEST CONTROL</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.8rem", color: "#fff", marginTop: 2 }}>Adjust assumptions to model intrinsic value</div>
            </div>
 
            <SectionHead>📊 Cash Flow</SectionHead>
            <Slider label="Base FCF (FY2025)" value={fcf} min={400} max={1200} step={10} fmt={fmtB} onChange={setFcf} sub="Free Cash Flow — $650M actual (Q4 2025)" />
            <Slider label="FCF Growth Rate (Yr 1–5)" value={growth} min={4} max={25} step={0.5} fmt={fmtPct} onChange={setGrowth} sub="12% conservative vs 14.8% historical avg" />
 
            <SectionHead>⚖️ Discount & Terminal</SectionHead>
            <Slider label="WACC" value={wacc} min={4} max={12} step={0.05} fmt={fmtPct} onChange={setWacc} sub="Avg WACC: 7.34% (β=0.77–0.80, ERP=4.18%)" />
            <Slider label="Terminal Growth Rate" value={tg} min={1} max={6} step={0.1} fmt={fmtPct} onChange={setTg} sub="4% → above long-run GDP; justified by industry tailwinds" />
 
            <SectionHead>🏢 Capital Structure</SectionHead>
            <Slider label="Shares Outstanding" value={shares} min={400} max={600} step={1} fmt={v => `${v.toFixed(0)}M`} onChange={setShares} sub="481.19M diluted (Balance Sheet 12/31/2025)" />
            <Slider label="Net Debt" value={netDebt} min={0} max={2000} step={10} fmt={fmtB} onChange={setNetDebt} sub="$623.7M debt − $528.2M cash = $95.5M net debt (10-K)" />
 
            <SectionHead>📈 Market</SectionHead>
            <Slider label="Current Market Price" value={mktPrice} min={30} max={120} step={0.5} fmt={fmtP} onChange={setMktPrice} sub="$57.57 — Yahoo Finance, March 2026" />
          </div>
 
          {/* Right — Output */}
          <div style={{ padding: "1.5rem", overflowY: "auto" }}>
 
            {/* Hero cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.9rem", marginBottom: "1.2rem" }}>
              {statCard("Intrinsic Value", fmtP(res.price), isUnder ? "#2e7d32" : R.deep, "DCF per share")}
              {statCard("Market Price", fmtP(mktPrice), R.darkgray, "Yahoo Finance · Mar 2026")}
              {statCard(isUnder ? "Upside" : "Downside", `${isUnder?"+":""}${upside.toFixed(1)}%`, isUnder ? "#2e7d32" : R.crimson, isUnder ? `${mos.toFixed(0)}% margin of safety` : "overvalued vs DCF")}
            </div>
 
            {/* DCF breakdown cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem", marginBottom: "1.2rem" }}>
              {[
                ["Σ PV of FCFs (5yr)", fmtB(res.pvSum), R.crimson],
                ["PV Terminal Value", fmtB(res.tv), R.deep],
                ["Enterprise Value", fmtB(res.ev), R.darkgray],
                ["Net Debt", fmtB(netDebt), "#ef6c00"],
                ["Equity Value", fmtB(res.equity), "#1565c0"],
                ["Terminal % of EV", `${((res.tv/res.ev)*100).toFixed(0)}%`, R.crimson],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: R.white, border: `1px solid ${R.rose}`, borderRadius: 8, padding: "0.7rem 1rem" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.57rem", color: R.gray, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.95rem", fontWeight: 700, color: "#111827" }}>{val}</div>
                </div>
              ))}
            </div>
 
            {/* 5-year projection table */}
            <div style={{ background: R.white, border: `1px solid ${R.rose}`, borderRadius: 10, marginBottom: "1.2rem", overflow: "hidden" }}>
              <div style={{ background: R.crimson, padding: "0.6rem 1rem" }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.65rem", color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>5-Year FCF Projection</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Mono',monospace", fontSize: "0.72rem" }}>
                  <thead>
                    <tr style={{ background: R.blush }}>
                      {["Year","Projected FCF","PV of FCF","Discount Factor"].map(h => (
                        <th key={h} style={{ padding: "0.5rem 0.9rem", textAlign: "right", color: R.deep, fontWeight: 700, fontSize: "0.62rem", textTransform: "uppercase", borderBottom: `1px solid ${R.rose}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {res.flows.map((f, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? R.white : R.offwhite }}>
                        <td style={{ padding: "0.45rem 0.9rem", color: R.crimson, fontWeight: 700, textAlign: "right" }}>{f.year}</td>
                        <td style={{ padding: "0.45rem 0.9rem", textAlign: "right", color: R.darkgray }}>{fmtB(f.projected)}</td>
                        <td style={{ padding: "0.45rem 0.9rem", textAlign: "right", color: R.darkgray }}>{fmtB(f.pv)}</td>
                        <td style={{ padding: "0.45rem 0.9rem", textAlign: "right", color: R.gray }}>{(f.pv / f.projected * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                    <tr style={{ background: R.blush, fontWeight: 700 }}>
                      <td style={{ padding: "0.45rem 0.9rem", color: R.deep, textAlign: "right" }}>Terminal</td>
                      <td style={{ padding: "0.45rem 0.9rem", textAlign: "right", color: R.gray, fontStyle: "italic" }}>—</td>
                      <td style={{ padding: "0.45rem 0.9rem", textAlign: "right", color: R.deep }}>{fmtB(res.tv)}</td>
                      <td style={{ padding: "0.45rem 0.9rem", textAlign: "right", color: R.gray }}>—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
 
            {/* Donut chart — EV Composition */}
            <div style={{ background: R.white, border: `1px solid ${R.rose}`, borderRadius: 10, padding: "1rem 1rem 0.75rem" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.65rem", color: R.deep, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                Enterprise Value Composition
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ position: "relative", height: 160 }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={[
                        { name: "Terminal Value", value: parseFloat(((res.tv/res.ev)*100).toFixed(1)) },
                        { name: "PV of FCFs",     value: parseFloat(((res.pvSum/res.ev)*100).toFixed(1)) },
                      ]} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                        <Cell fill={R.deep} />
                        <Cell fill={R.crimson} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", fontWeight: 900, color: R.deep, lineHeight: 1 }}>{((res.tv/res.ev)*100).toFixed(0)}%</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.48rem", color: R.gray, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>Terminal</div>
                  </div>
                </div>
                <div>
                  {[
                    { label: "Terminal Value",   val: fmtB(res.tv),    pct: `${((res.tv/res.ev)*100).toFixed(1)}%`,   color: R.deep    },
                    { label: "PV of FCFs (5yr)", val: fmtB(res.pvSum), pct: `${((res.pvSum/res.ev)*100).toFixed(1)}%`, color: R.crimson },
                    { label: "Enterprise Value", val: fmtB(res.ev),    pct: "100%",                                    color: "#374151" },
                  ].map(item => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.45rem 0", borderBottom: `1px solid ${R.blush}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.63rem", color: R.gray, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</span>
                      </div>
                      <div style={{ display: "flex", gap: "1.2rem" }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.72rem", color: "#111827", fontWeight: 700 }}>{item.val}</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.68rem", color: item.color, fontWeight: 600, minWidth: 38, textAlign: "right" }}>{item.pct}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: "0.6rem", background: R.blush, borderRadius: 6, padding: "0.5rem 0.75rem" }}>
                    <div style={{ fontFamily: "Georgia,serif", fontSize: "0.65rem", color: R.darkgray, fontStyle: "italic", lineHeight: 1.6 }}>
                      <strong style={{ color: R.deep }}>{((res.tv/res.ev)*100).toFixed(0)}% of enterprise value</strong> depends on terminal growth — which is why a 1% shift in terminal growth rate moves intrinsic value by ~$6–9 per share.
                    </div>
                  </div>
                </div>
              </div>
            </div>
 
            {/* Verdict */}
            <div style={{ marginTop: "1rem", background: isUnder ? "#f1f8e9" : R.blush, border: `1px solid ${isUnder ? "#a5d6a7" : R.rose}`, borderRadius: 8, padding: "0.85rem 1.1rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.2rem", marginTop: 2 }}>{isUnder ? "🟢" : "🔴"}</span>
              <div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.85rem", color: isUnder ? "#2e7d32" : R.deep, fontWeight: 700 }}>
                  {isUnder ? `ROL appears undervalued by ${Math.abs(upside).toFixed(1)}% — ${mos.toFixed(0)}% margin of safety vs intrinsic value`
                           : `ROL appears overvalued by ${Math.abs(upside).toFixed(1)}% at current price`}
                </div>
                <div style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: "0.63rem", color: R.gray, marginTop: 3 }}>
                  High-quality compounders like Rollins often trade at a premium to DCF — 24 consecutive years of revenue growth, Orkin moat, and recession-resistant cash flows command a premium. Model-dependent; verify assumptions against SEC filings.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {/* ══ SENSITIVITY TAB ═════════════════════════════════════════════ */}
      {activeTab === "sensitivity" && (
        <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", color: R.deep, margin: "0 0 4px" }}>Sensitivity Analysis — Intrinsic Share Price</h2>
            <p style={{ fontFamily: "Georgia,serif", fontSize: "0.72rem", color: R.gray, margin: 0, fontStyle: "italic" }}>
              WACC (rows) × Terminal Growth Rate (columns) · FCF growth rate locked at {growth.toFixed(1)}% · Base FCF ${fcf}M · {shares.toFixed(0)}M shares · Net debt {fmtB(netDebt)} · Adjust sliders on the DCF tab to update.
            </p>
          </div>
 
          {/* Heatmap */}
          <div style={{ background: R.white, border: `1px solid ${R.rose}`, borderRadius: 12, overflow: "hidden", marginBottom: "1.5rem", boxShadow: "0 2px 12px rgba(139,0,0,0.07)" }}>
            <div style={{ background: "#1C2B3A", padding: "0.7rem 1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.65rem", color: "#A8C4D8", letterSpacing: "0.1em", textTransform: "uppercase" }}>Intrinsic Value per Share — WACC vs Terminal Growth Rate</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.6rem", color: "#7FB3CC" }}>Market: {fmtP(mktPrice)}</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "'DM Mono',monospace" }}>
                <thead>
                  <tr>
                    <th style={{ background: "#0F1E2B", color: "#7FB3CC", padding: "0.55rem 0.9rem", fontSize: "0.62rem", textAlign: "center", whiteSpace: "nowrap", minWidth: 90 }}>
                      WACC ↓ / TGR →
                    </th>
                    {tgRange.map(t => (
                      <th key={t} style={{ background: Math.abs(t - tg) < 0.01 ? "#2A5A7A" : "#1C2B3A", color: Math.abs(t - tg) < 0.01 ? "#E0F0FF" : "#A8C4D8", padding: "0.55rem 0.75rem", fontSize: "0.65rem", textAlign: "center", minWidth: 78, borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                        {t.toFixed(1)}%
                        {Math.abs(t - tg) < 0.01 && <div style={{ fontSize: "0.5rem", color: "#7FB3CC" }}>◄ base</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {waccRange.map((w, wi) => (
                    <tr key={w}>
                      <td style={{ background: Math.abs(w - wacc) < 0.1 ? "#2A5A7A" : "#1C2B3A", color: Math.abs(w - wacc) < 0.1 ? "#E0F0FF" : "#A8C4D8", padding: "0.5rem 0.9rem", fontSize: "0.65rem", fontWeight: 700, textAlign: "center", whiteSpace: "nowrap", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        {w.toFixed(2)}%
                        {Math.abs(w - wacc) < 0.1 && <div style={{ fontSize: "0.5rem", color: "#7FB3CC" }}>▲ base</div>}
                      </td>
                      {tgRange.map((t, ti) => {
                        const val = sensitivityGrid[wi][ti];
                        const { bg, color } = heatColor(val, sMin, sMax, mktPrice);
                        const isBase = Math.abs(w - wacc) < 0.1 && Math.abs(t - tg) < 0.01;
                        return (
                          <td key={t} style={{ background: bg, color, padding: "0.5rem 0.75rem", textAlign: "center", fontSize: "0.72rem", fontWeight: isBase ? 900 : 500, border: isBase ? `2px solid #fff` : "1px solid rgba(0,0,0,0.06)", position: "relative" }}>
                            {fmtP(val)}
                            {isBase && <div style={{ fontSize: "0.45rem", opacity: 0.8 }}>BASE</div>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
 
          {/* Legend */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem", alignItems: "center" }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.62rem", color: R.gray, textTransform: "uppercase", letterSpacing: "0.08em" }}>Legend vs market price ({fmtP(mktPrice)}):</span>
            {[
              ["#004D1A","#A8F0C0",">+20% upside"],
              ["#1B7F3A","#E8F8EE","+8% to +20%"],
              ["#4CAF50","#fff","0% to +8%"],
              ["#F4C430","#1A1A00","-2% to 0%"],
              ["#D84315","#FFE8E0","-12% to -2%"],
              ["#7B0000","#FFCCCC","< -12%"],
            ].map(([bg, color, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: bg }} />
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.6rem", color: R.darkgray }}>{label}</span>
              </div>
            ))}
          </div>
 
          {/* Secondary heatmap: FCF Growth vs WACC */}
          <div style={{ background: R.white, border: `1px solid ${R.rose}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(139,0,0,0.07)" }}>
            <div style={{ background: "#1C2B3A", padding: "0.7rem 1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.65rem", color: "#A8C4D8", letterSpacing: "0.1em", textTransform: "uppercase" }}>FCF Growth Rate vs WACC — Intrinsic Value per Share</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.6rem", color: "#7FB3CC" }}>Terminal growth locked at {tg.toFixed(1)}%</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              {(() => {
                const growthRange = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
                const waccRange2  = [5.5, 6.0, 6.5, 7.0, 7.23, 7.5, 8.0, 8.5, 9.0];
                const grid2 = waccRange2.map(w => growthRange.map(g => calcDCF(fcf, g, tg, w, shares, netDebt).price));
                return (
                  <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "'DM Mono',monospace" }}>
                    <thead>
                      <tr>
                        <th style={{ background: "#0F1E2B", color: "#7FB3CC", padding: "0.55rem 0.9rem", fontSize: "0.62rem", textAlign: "center", minWidth: 90 }}>WACC ↓ / g →</th>
                        {growthRange.map(g => (
                          <th key={g} style={{ background: Math.abs(g - growth) < 0.1 ? "#2A5A7A" : "#1C2B3A", color: Math.abs(g - growth) < 0.1 ? "#E0F0FF" : "#A8C4D8", padding: "0.55rem 0.75rem", fontSize: "0.65rem", textAlign: "center", minWidth: 72, borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                            {g}%
                            {Math.abs(g - growth) < 0.1 && <div style={{ fontSize: "0.5rem", color: "#7FB3CC" }}>◄ base</div>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {waccRange2.map((w, wi) => (
                        <tr key={w}>
                          <td style={{ background: Math.abs(w - wacc) < 0.1 ? "#2A5A7A" : "#1C2B3A", color: Math.abs(w - wacc) < 0.1 ? "#E0F0FF" : "#A8C4D8", padding: "0.5rem 0.9rem", fontSize: "0.65rem", fontWeight: 700, textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            {w.toFixed(2)}%
                            {Math.abs(w - wacc) < 0.1 && <div style={{ fontSize: "0.5rem", color: R.rose }}>▲ base</div>}
                          </td>
                          {growthRange.map((g, gi) => {
                            const val = grid2[wi][gi];
                            const { bg, color } = heatColor(val, 0, 0, mktPrice);
                            const isBase = Math.abs(w - wacc) < 0.1 && Math.abs(g - growth) < 0.1;
                            return (
                              <td key={g} style={{ background: bg, color, padding: "0.5rem 0.75rem", textAlign: "center", fontSize: "0.72rem", fontWeight: isBase ? 900 : 500, border: isBase ? "2px solid #fff" : "1px solid rgba(0,0,0,0.06)" }}>
                                {fmtP(val)}
                                {isBase && <div style={{ fontSize: "0.45rem", opacity: 0.8 }}>BASE</div>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
 
          <div style={{ marginTop: "1rem", background: R.blush, border: `1px solid ${R.rose}`, borderRadius: 8, padding: "0.85rem 1.1rem" }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.82rem", color: R.deep, fontWeight: 700, marginBottom: 4 }}>📌 Analyst Interpretation</div>
            <div style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: "0.67rem", color: R.darkgray, lineHeight: 1.6 }}>
              At Rollins' WACC of 7.34% and 4% terminal growth, the base-case intrinsic value is <strong>{fmtP(res.price)}</strong> vs market price of <strong>{fmtP(mktPrice)}</strong>.
              A 1% shift in terminal growth rate moves intrinsic value by ~$6–9 per share — more than any equivalent shift in WACC or FCF growth.
              Rollins' fair pricing reflects a bounded $26B TAM and 15% market share, structurally limiting long-run FCF growth vs. Tech or Healthcare.
            </div>
          </div>
        </div>
      )}
 
      {/* ══ INSIGHTS TAB ════════════════════════════════════════════════ */}
      {activeTab === "insights" && (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "3rem 2rem" }}>
          <div style={{ borderLeft: `5px solid ${R.crimson}`, paddingLeft: "1.5rem", marginBottom: "2rem" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.62rem", color: R.crimson, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Rollins, Inc. (ROL) · DCF Study · March 2026</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", fontWeight: 900, color: R.deep, margin: 0 }}>Key Insights</h2>
          </div>
          <div style={{ background: R.white, border: `1px solid ${R.rose}`, borderRadius: 12, padding: "2rem 2.25rem", boxShadow: "0 2px 10px rgba(139,0,0,0.06)" }}>
            <p style={{ fontFamily: "Georgia,serif", fontSize: "1rem", color: R.darkgray, lineHeight: 2, margin: 0 }}>
              A 1% shift in terminal growth rate adds roughly $6–9 to intrinsic value — more than any equivalent change in WACC or FCF growth. Since terminal growth requires predicting perpetual performance, it is also the assumption we can least anchor to data. Our result of <strong style={{ color: R.deep }}>$59.46 vs. $57.57</strong> reflects the market's accurate view that Rollins will grow steadily, but within the boundaries of what a $26B industry can support. At 15% market share, Rollins lacks the unlimited addressable market of Tech or Healthcare, which structurally caps long-run FCF growth. Intrinsic value is therefore best read as a structured estimation across reasonable assumptions — not a price target.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
 
function SectionHead({ children }) {
  return (
    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.62rem", color: R.crimson, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: `1px solid ${R.rose}`, paddingBottom: "0.3rem", marginBottom: "0.9rem", marginTop: "0.5rem" }}>
      {children}
    </div>
  );
}
