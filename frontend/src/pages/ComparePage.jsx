import { useEffect, useState, useRef } from "react";
import { screenStocks } from "../services/api";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const cleanTicker = (t) => (t ? t.replace(".NS", "").replace(".BO", "") : "—");
const fmtPrice = (v) =>
  v == null
    ? "—"
    : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const fmtMcap = (v) => {
  if (v == null) return "—";
  const n = Number(v);
  if (n >= 1e12) return `₹${(n / 1e12).toFixed(2)}L Cr`;
  if (n >= 1e9) return `₹${(n / 1e9).toFixed(2)} Cr`;
  return `₹${n.toLocaleString("en-IN")}`;
};
const fmtPct = (v) =>
  v == null
    ? "—"
    : `${Number(v) >= 0 ? "+" : ""}${(Number(v) * 100).toFixed(1)}%`;
const fmtNum = (v) => (v == null ? "—" : Number(v).toFixed(2));

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6"];

// Metrics to compare
const METRICS = [
  { key: "marketCap", label: "Market Cap", format: fmtMcap, higher: true },
  { key: "revenue", label: "Revenue (Annual)", format: fmtMcap, higher: true },
  { key: "eps", label: "EPS", format: fmtNum, higher: true },
  {
    key: "roe",
    label: "ROE",
    format: (v) => (v == null ? "—" : `${(Number(v) * 100).toFixed(1)}%`),
    higher: true,
  },
  { key: "peRatio", label: "P/E", format: fmtNum, higher: false },
  { key: "debtToEquity", label: "Debt/Equity", format: fmtNum, higher: false },
  {
    key: "dividendYield",
    label: "Dividend Yield",
    format: (v) => (v == null ? "—" : `${(Number(v) * 100).toFixed(2)}%`),
    higher: true,
  },
  { key: "priceToBook", label: "Price/Book", format: fmtNum, higher: false },
  {
    key: "rsi14",
    label: "RSI (14)",
    format: (v) => (v == null ? "—" : Number(v).toFixed(1)),
    higher: null,
  },
  { key: "sma50", label: "SMA 50", format: fmtPrice, higher: null },
  { key: "sma200", label: "SMA 200", format: fmtPrice, higher: null },
  { key: "price", label: "Current Price", format: fmtPrice, higher: null },
  {
    key: "changePercent",
    label: "Change %",
    format: (v) =>
      v == null ? "—" : `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`,
    higher: true,
  },
  {
    key: "freeCashFlow",
    label: "Free Cash Flow",
    format: fmtMcap,
    higher: true,
  },
];

// Radar metrics (normalized 0-100)
const RADAR_METRICS = [
  { key: "roe", label: "ROE", max: 0.6 },
  { key: "eps", label: "EPS", max: 500 },
  { key: "dividendYield", label: "Div Yield", max: 0.06 },
  { key: "rsi14", label: "Momentum", max: 100 },
  { key: "peRatio", label: "Valuation", max: 100, invert: true },
];

export default function ComparePage() {
  const [allStocks, setAllStocks] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef(null);

  useEffect(() => {
    screenStocks([], { field: "market_cap", direction: "desc" }, 0, 200)
      .then((r) => setAllStocks(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchResults = search.trim()
    ? allStocks
        .filter((s) => {
          const q = search.toLowerCase();
          return (
            ((s.companyName || "").toLowerCase().includes(q) ||
              cleanTicker(s.ticker).toLowerCase().includes(q)) &&
            !selected.some((sel) => sel.ticker === s.ticker)
          );
        })
        .slice(0, 6)
    : [];

  const addStock = (stock) => {
    if (selected.length < 5) {
      setSelected([...selected, stock]);
    }
    setSearch("");
    setShowDropdown(false);
  };

  const removeStock = (ticker) => {
    setSelected(selected.filter((s) => s.ticker !== ticker));
  };

  // Find best value for highlighting
  const getBest = (metric) => {
    if (metric.higher === null || selected.length < 2) return null;
    const values = selected.map((s) => Number(s[metric.key] || 0));
    if (metric.higher) return Math.max(...values);
    return Math.min(...values.filter((v) => v > 0));
  };

  const isBest = (metric, stock) => {
    const best = getBest(metric);
    if (best === null) return false;
    const val = Number(stock[metric.key] || 0);
    if (metric.higher) return val === best && val > 0;
    return val === best && val > 0;
  };

  // Build radar data
  const radarData = RADAR_METRICS.map((rm) => {
    const point = { metric: rm.label };
    selected.forEach((s) => {
      let val = Number(s[rm.key] || 0);
      if (rm.invert) val = rm.max - val;
      point[cleanTicker(s.ticker)] = Math.max(
        0,
        Math.min(100, (val / rm.max) * 100),
      );
    });
    return point;
  });

  if (loading)
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Compare Stocks
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Side-by-side comparison of up to 5 stocks.
        </p>
      </div>

      {/* ═══ Selected Stocks + Search ═════════════════ */}
      <div className="bg-[#111827] border border-slate-700/40 rounded-xl p-6">
        <h3 className="text-[15px] font-bold text-white mb-4">
          Selected Stocks
        </h3>

        {/* Selected tags */}
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {selected.map((s, i) => (
              <span
                key={s.ticker}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border"
                style={{
                  color: COLORS[i],
                  borderColor: COLORS[i] + "40",
                  backgroundColor: COLORS[i] + "10",
                }}
              >
                {cleanTicker(s.ticker)}
                <button
                  onClick={() => removeStock(s.ticker)}
                  className="hover:opacity-70 cursor-pointer text-xs"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm mb-4">No stocks selected yet.</p>
        )}

        {/* Search */}
        {selected.length < 5 && (
          <div className="relative max-w-lg" ref={searchRef}>
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search by name or ticker..."
              className="w-full bg-slate-800/80 border border-slate-600/40 rounded-xl pl-11 pr-4 py-3
                         text-sm text-slate-200 placeholder-slate-500
                         focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/10 transition-all"
            />

            {showDropdown && searchResults.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-2 bg-[#0c1222] border border-slate-700 rounded-xl 
                              shadow-2xl shadow-black/30 z-50 overflow-hidden"
              >
                {searchResults.map((s) => (
                  <button
                    key={s.ticker}
                    onClick={() => addStock(s)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-800/80 
                               transition-colors cursor-pointer border-b border-slate-700/30 last:border-0 text-left group"
                  >
                    <div>
                      <p className="text-sm text-white font-medium group-hover:text-green-400 transition-colors">
                        {s.companyName || cleanTicker(s.ticker)}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {cleanTicker(s.ticker)} · {s.sector}
                      </p>
                    </div>
                    <p className="text-sm text-slate-300">
                      {fmtPrice(s.price)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {selected.length >= 5 && (
          <p className="text-xs text-amber-400">
            Maximum 5 stocks reached. Remove one to add another.
          </p>
        )}
      </div>

      {/* ═══ Comparison Table ═════════════════════════ */}
      {selected.length > 0 && (
        <div className="bg-[#111827] border border-slate-700/40 rounded-xl p-6">
          <h3 className="text-[15px] font-bold text-white mb-1">Comparison</h3>
          <p className="text-xs text-slate-500 mb-5">
            Analytical ranking based on demo data, not investment advice or a
            guarantee of future performance.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold w-[200px]">
                    Metric
                  </th>
                  {selected.map((s, i) => (
                    <th
                      key={s.ticker}
                      className="text-right px-4 py-3 text-[11px] uppercase tracking-wider font-semibold"
                      style={{ color: COLORS[i] }}
                    >
                      {cleanTicker(s.ticker)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric) => (
                  <tr
                    key={metric.key}
                    className="border-b border-slate-700/20 hover:bg-slate-700/10 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-slate-300 font-medium">
                      {metric.label}
                    </td>
                    {selected.map((s) => {
                      const best = isBest(metric, s);
                      return (
                        <td
                          key={s.ticker}
                          className={`px-4 py-3.5 text-right font-medium ${best ? "text-green-400" : "text-slate-300"}`}
                          style={
                            best
                              ? { backgroundColor: "rgba(34, 197, 94, 0.08)" }
                              : {}
                          }
                        >
                          {metric.format(s[metric.key])}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Metric Radar ════════════════════════════ */}
      {selected.length >= 2 && (
        <div className="bg-[#111827] border border-slate-700/40 rounded-xl p-6">
          <h3 className="text-[15px] font-bold text-white mb-1">
            Metric Radar
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Normalized comparison across key metrics
          </p>

          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
              />
              <PolarRadiusAxis
                tick={false}
                axisLine={false}
                domain={[0, 100]}
              />
              {selected.map((s, i) => (
                <Radar
                  key={s.ticker}
                  name={cleanTicker(s.ticker)}
                  dataKey={cleanTicker(s.ticker)}
                  stroke={COLORS[i]}
                  fill={COLORS[i]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                formatter={(value) => (
                  <span style={{ color: "#94a3b8", fontSize: 13 }}>
                    {value}
                  </span>
                )}
              />
              <Tooltip
                contentStyle={{
                  background: "#0c1222",
                  border: "1px solid #1e293b",
                  borderRadius: 10,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer disclaimer */}
      {selected.length === 0 && (
        <div className="text-center py-12">
          <span className="text-4xl">📊</span>
          <p className="text-slate-400 mt-3">
            Select stocks above to compare them side-by-side
          </p>
          <p className="text-slate-500 text-xs mt-1">
            You can compare up to 5 stocks at once
          </p>
        </div>
      )}
    </div>
  );
}
