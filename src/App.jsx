import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SliderInput = ({ label, value, min, max, step, format, onChange, color, description }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: "1.4rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "#8a9bb0", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.05rem", color: color || "#e8c97a", fontWeight: 700 }}>{format(value)}</span>
      </div>
      {description && <div style={{ fontSize: "0.62rem", color: "#4a5a6a", marginBottom: "0.4rem", fontFamily: "Georgia, serif", fontStyle: "italic" }}>{description}</div>}
      <div style={{ position: "relative", height: "4px", background: "#1a2535", borderRadius: "2px" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, #1e3a5f, ${color || "#e8c97a"})`, borderRadius: "2px" }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ position: "absolute", top: "-8px", left: 0, width: "100%", opacity: 0, cursor: "pointer", height: "20px", margin: 0 }} />
        <div style={{ position: "absolute", top: "-5px", left: `calc(${pct}% - 7px)`, width: "14px", height: "14px", borderRadius: "50%", background: color || "#e8c97a", boxShadow: `0 0 8px ${color || "#e8c97a"}88`, pointerEvents: "none" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", color: "#2d3f52" }}>{format(min)}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", color: "#2d3f52" }}>{format(max)}</span>
      </div>
    </div>
  );
};

const fmt$ = v => v >= 1000 ? `$${(v/1000).toFixed(1)}B` : `$${v.toFixed(0)}M`;
const fmtPct = v => `${v.toFixed(1)}%`;
const fmtShares = v => `${v.toFixed(0)}M`;
const fmtPrice = v => `$${v.toFixed(2)}`;

function calcDCF({ fcf, growthRate1, growthRate2, terminalGrowth, wacc, shares, netDebt }) {
  const waccD = wacc / 100;
  const g1 = growthRate1 / 100;
  const g2 = growthRate2 / 100;
  const tg = terminalGrowth / 100;
  const cashFlows = [];
  let cf = fcf;
  let pvSum = 0;
  for (let y = 1; y <= 10; y++) {
    cf = cf * (1 + (y <= 5 ? g1 : g2));
    const pv = cf / Math.pow(1 + waccD, y);
    cashFlows.push({ year: `Yr ${y}`, fcf: cf, pv, phase: y <= 5 ? "phase1" : "phase2" });
    pvSum += pv;
  }
  const lastFCF = cashFlows[9].fcf;
  const terminalValue = (lastFCF * (1 + tg)) / (waccD - tg);
  const pvTerminal = terminalValue / Math.pow(1 + waccD, 10);
  const enterpriseValue = pvSum + pvTerminal;
  const equityValue = enterpriseValue - netDebt;
  const intrinsicPrice = equityValue / shares;
  return { cashFlows, pvSum, terminalValue, pvTerminal, enterpriseValue, equityValue, intrinsicPrice };
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", padding: "0.6rem 0.9rem", borderRadius: "6px" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "#8a9bb0", marginBottom: "0.3rem" }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: p.color || "#e8c97a" }}>
            {p.name}: {fmt$(p.value)}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DCFCalculator() {
  const [fcf, setFcf] = useState(500);
  const [growthRate1, setGrowthRate1] = useState(15);
  const [growthRate2, setGrowthRate2] = useState(8);
  const [terminalGrowth, setTerminalGrowth] = useState(2.5);
  const [wacc, setWacc] = useState(10);
  const [shares, setShares] = useState(200);
  const [netDebt, setNetDebt] = useState(1000);
  const [currentPrice, setCurrentPrice] = useState(45);

  const result = useMemo(() => calcDCF({ fcf, growthRate1, growthRate2, terminalGrowth, wacc, shares, netDebt }),
    [fcf, growthRate1, growthRate2, terminalGrowth, wacc, shares, netDebt]);

  const upside = ((result.intrinsicPrice - currentPrice) / currentPrice) * 100;
  const isUndervalued = result.intrinsicPrice > currentPrice;
  const marginOfSafety = ((result.intrinsicPrice - currentPrice) / result.intrinsicPrice) * 100;

  const chartData = [
    ...result.cashFlows.map(cf => ({ year: cf.year, "PV of FCF": parseFloat(cf.pv.toFixed(1)), phase: cf.phase })),
    { year: "Terminal", "PV Terminal": parseFloat(result.pvTerminal.toFixed(1)), phase: "terminal" }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#060e1a", color: "#c8d8e8", fontFamily: "Georgia, serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "linear-gradient(180deg, #0a1628 0%, #060e1a 100%)", borderBottom: "1px solid #1a2a3a", padding: "1.5rem 2rem 1.2rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", flexWrap: "wrap" }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 900, color: "#e8c97a", margin: 0 }}>DCF Valuation Engine</h1>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "#3a5a7a", letterSpacing: "0.12em", textTransform: "uppercase" }}>Discounted Cash Flow · Intrinsic Value</span>
        </div>
        <p style={{ fontFamily: "Georgia, serif", fontSize: "0.72rem", color: "#4a6a8a", marginTop: "0.4rem", marginBottom: 0, fontStyle: "italic" }}>
          Adjust the variables below to model intrinsic share price using a 10-year DCF projection.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", minHeight: "calc(100vh - 100px)" }}>

        {/* LEFT — Sliders */}
        <div style={{ padding: "1.5rem", borderRight: "1px solid #121e2e", background: "#070f1c", overflowY: "auto" }}>

          <div style={{ marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #111e2e" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "#3a6a9a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.9rem" }}>📊 Cash Flow Inputs</div>
            <SliderInput label="Base Free Cash Flow" value={fcf} min={50} max={5000} step={50} format={fmt$} onChange={setFcf} color="#5bc8f5" description="Current annual FCF the company generates" />
            <SliderInput label="Growth Rate — Yrs 1–5" value={growthRate1} min={-5} max={50} step={0.5} format={fmtPct} onChange={setGrowthRate1} color="#7be8a0" description="Near-term high-growth phase" />
            <SliderInput label="Growth Rate — Yrs 6–10" value={growthRate2} min={-5} max={30} step={0.5} format={fmtPct} onChange={setGrowthRate2} color="#a0d8a0" description="Maturing growth phase" />
          </div>

          <div style={{ marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #111e2e" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "#3a6a9a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.9rem" }}>⚖️ Discount & Terminal</div>
            <SliderInput label="WACC / Discount Rate" value={wacc} min={4} max={20} step={0.25} format={fmtPct} onChange={setWacc} color="#f59b5b" description="Weighted average cost of capital" />
            <SliderInput label="Terminal Growth Rate" value={terminalGrowth} min={0} max={5} step={0.1} format={fmtPct} onChange={setTerminalGrowth} color="#e8c97a" description="Perpetual growth after yr 10 (≈ GDP)" />
          </div>

          <div style={{ marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #111e2e" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "#3a6a9a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.9rem" }}>🏢 Capital Structure</div>
            <SliderInput label="Shares Outstanding" value={shares} min={10} max={5000} step={10} format={fmtShares} onChange={setShares} color="#c59bf5" description="Total diluted shares (millions)" />
            <SliderInput label="Net Debt" value={netDebt} min={-5000} max={20000} step={100} format={fmt$} onChange={setNetDebt} color="#f57a7a" description="Total debt minus cash (negative = net cash)" />
          </div>

          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "#3a6a9a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.9rem" }}>📈 Market Comparison</div>
            <SliderInput label="Current Market Price" value={currentPrice} min={1} max={500} step={0.5} format={fmtPrice} onChange={setCurrentPrice} color="#8ab8f5" description="Current stock price for margin of safety" />
          </div>
        </div>

        {/* RIGHT — Output */}
        <div style={{ padding: "1.5rem", overflowY: "auto" }}>

          {/* Hero Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ background: isUndervalued ? "linear-gradient(135deg,#061a0e,#0a2818)" : "linear-gradient(135deg,#1a0606,#280a0a)", border: `1px solid ${isUndervalued ? "#1a4a2a" : "#4a1a1a"}`, borderRadius: "10px", padding: "1.2rem", textAlign: "center" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "#5a8a6a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Intrinsic Value</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", fontWeight: 900, color: isUndervalued ? "#5be890" : "#f57a7a", lineHeight: 1 }}>{fmtPrice(result.intrinsicPrice)}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: isUndervalued ? "#3a7a5a" : "#7a3a3a", marginTop: "0.4rem" }}>per share</div>
            </div>

            <div style={{ background: "#07101e", border: "1px solid #1a2a3a", borderRadius: "10px", padding: "1.2rem", textAlign: "center" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "#5a7a9a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Market Price</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", fontWeight: 900, color: "#8ab8f5", lineHeight: 1 }}>{fmtPrice(currentPrice)}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: "#3a5a7a", marginTop: "0.4rem" }}>current</div>
            </div>

            <div style={{ background: isUndervalued ? "linear-gradient(135deg,#06150a,#0a2010)" : "linear-gradient(135deg,#150606,#200a0a)", border: `1px solid ${isUndervalued ? "#1a4a2a" : "#4a1a1a"}`, borderRadius: "10px", padding: "1.2rem", textAlign: "center" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "#5a8a6a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.4rem" }}>{isUndervalued ? "Upside" : "Downside"}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", fontWeight: 900, color: isUndervalued ? "#5be890" : "#f57a7a", lineHeight: 1 }}>{isUndervalued ? "+" : ""}{upside.toFixed(1)}%</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: isUndervalued ? "#3a7a5a" : "#7a3a3a", marginTop: "0.4rem" }}>
                {isUndervalued ? `${marginOfSafety.toFixed(0)}% margin of safety` : "overvalued"}
              </div>
            </div>
          </div>

          {/* DCF Component Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {[
              { label: "PV of FCFs (10yr)", value: fmt$(result.pvSum), color: "#5bc8f5" },
              { label: "PV of Terminal Value", value: fmt$(result.pvTerminal), color: "#e8c97a" },
              { label: "Enterprise Value", value: fmt$(result.enterpriseValue), color: "#7be8a0" },
              { label: "Net Debt", value: fmt$(netDebt), color: "#f57a7a" },
              { label: "Equity Value", value: fmt$(result.equityValue), color: "#c59bf5" },
              { label: "Terminal % of EV", value: `${((result.pvTerminal / result.enterpriseValue) * 100).toFixed(0)}%`, color: "#f59b5b" },
            ].map((item, i) => (
              <div key={i} style={{ background: "#08111f", border: "1px solid #111e2e", borderRadius: "8px", padding: "0.75rem 1rem" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", color: "#4a6a8a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.25rem" }}>{item.label}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.95rem", fontWeight: 700, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ background: "#08111f", border: "1px solid #111e2e", borderRadius: "10px", padding: "1rem 0.5rem 0.5rem", marginBottom: "1rem" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "#3a6a9a", letterSpacing: "0.12em", textTransform: "uppercase", paddingLeft: "1rem", marginBottom: "0.75rem" }}>
              Present Value Breakdown — 10yr Projection + Terminal
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={chartData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                <XAxis dataKey="year" tick={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fill: "#3a5a7a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fill: "#3a5a7a" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}B`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="PV of FCF" radius={[3,3,0,0]} maxBarSize={30}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.phase === "phase1" ? "#1e6a9a" : entry.phase === "phase2" ? "#1a9a6a" : "#9a7a1a"} />
                  ))}
                </Bar>
                <Bar dataKey="PV Terminal" radius={[3,3,0,0]} fill="#9a7a1a" maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", paddingTop: "0.5rem" }}>
              {[["#1e6a9a","Yr 1–5 FCF"],["#1a9a6a","Yr 6–10 FCF"],["#9a7a1a","Terminal Value"]].map(([color,label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: color }} />
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "#4a6a8a" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verdict */}
          <div style={{ background: isUndervalued ? "#06140a" : "#140606", border: `1px solid ${isUndervalued ? "#1a3a22" : "#3a1a1a"}`, borderRadius: "8px", padding: "0.85rem 1.1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.3rem" }}>{isUndervalued ? "🟢" : "🔴"}</span>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.85rem", color: isUndervalued ? "#5be890" : "#f57a7a", fontWeight: 700 }}>
                {isUndervalued
                  ? `Potentially undervalued by ${Math.abs(upside).toFixed(1)}% — ${marginOfSafety.toFixed(0)}% margin of safety`
                  : `Potentially overvalued by ${Math.abs(upside).toFixed(1)}% at current price`}
              </div>
              <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "0.65rem", color: "#3a5a5a", marginTop: "0.2rem" }}>
                Intrinsic value is model-dependent. Verify assumptions against actual financial statements.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
