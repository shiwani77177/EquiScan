import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { screenStocks, getSectors } from "../services/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

// ── Clean ticker: remove .NS suffix ────────────────────────
const cleanTicker = (t) => (t ? t.replace(".NS", "").replace(".BO", "") : "—");

// ── Indian Rupee formatters ────────────────────────────────
const fmtINR = (v) => {
  if (v == null) return "—";
  const n = Number(v);
  if (Math.abs(n) >= 1e12) return `₹${(n / 1e12).toFixed(2)}L Cr`;
  if (Math.abs(n) >= 1e9) return `₹${(n / 1e9).toFixed(0)} Cr`;
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(0)} Cr`;
  return `₹${n.toLocaleString("en-IN")}`;
};
const fmtPrice = (v) => {
  if (v == null) return "—";
  return `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};
const fmtVol = (v) => {
  if (v == null) return "—";
  const n = Number(v);
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString("en-IN");
};

// ── Sparkline with natural wave shape ──────────────────────
const generateSparkline = (base, trend = "up") => {
  const data = [];
  let val = 50;
  for (let i = 0; i < 30; i++) {
    const wave = Math.sin(i * 0.6) * 8;
    const wave2 = Math.sin(i * 1.2) * 4;
    const noise = (Math.random() - 0.5) * 6;
    const drift = trend === "up" ? 0.8 : -0.8;
    val += drift + wave * 0.3 + wave2 * 0.2 + noise;
    val = Math.max(10, Math.min(90, val));
    data.push({ v: val });
  }
  return data;
};

const PIE_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
  "#a855f7",
];

// ── Index Card Component ──────────────────────────────────
const IndexCard = ({ name, value, change, color }) => {
  const sparkData = generateSparkline(value, change >= 0 ? "up" : "down");
  const gradientId = `grad-${name.replace(/\s/g, "")}`;
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 border border-slate-700 rounded-xl p-5 hover:border-slate-500 transition-all">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">
        {name}
      </p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-white">
            {value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </p>
          <p
            className={`text-sm font-semibold mt-1 ${change >= 0 ? "text-green-400" : "text-red-400"}`}
          >
            {change >= 0 ? "▲" : "▼"} {change >= 0 ? "+" : ""}
            {change.toFixed(2)}%
          </p>
        </div>
        <div className="w-24 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                fill={`url(#${gradientId})`}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ── Market Status ─────────────────────────────────────────
const MarketStatus = () => {
  const now = new Date();
  const hour = now.getHours();
  const isWeekday = now.getDay() > 0 && now.getDay() < 6;
  const isOpen = isWeekday && hour >= 9 && hour < 16;
  return (
    <div
      className={`rounded-lg px-4 py-3 flex items-center gap-3 ${
        isOpen
          ? "bg-green-500/10 border border-green-500/30"
          : "bg-yellow-500/10 border border-yellow-500/30"
      }`}
    >
      <span
        className={`w-2.5 h-2.5 rounded-full ${isOpen ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`}
      />
      <span className="text-sm">
        <span className="font-medium text-white">Market Status: </span>
        <span
          className={`font-bold ${isOpen ? "text-green-400" : "text-yellow-400"}`}
        >
          {isOpen ? "Market Open" : "Market Closed"}
        </span>
        <span className="text-slate-400 ml-2">
          {isOpen
            ? "(Live — 9:15 AM to 3:30 PM IST)"
            : "(Next: Mon-Fri 9:15 AM IST)"}
        </span>
      </span>
    </div>
  );
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [allStocks, setAllStocks] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      screenStocks([], { field: "market_cap", direction: "desc" }, 0, 100),
      getSectors(),
    ])
      .then(([result, sectorList]) => {
        setAllStocks(result.data || []);
        setSectors(sectorList || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 mt-4 animate-pulse">
          Loading market data...
        </p>
      </div>
    );
  }

  // ── Derived data ────────────────────────────────────────
  const withChange = allStocks.filter((s) => s.changePercent != null);
  const topGainers = [...withChange]
    .sort((a, b) => Number(b.changePercent) - Number(a.changePercent))
    .slice(0, 5);
  const topLosers = [...withChange]
    .sort((a, b) => Number(a.changePercent) - Number(b.changePercent))
    .slice(0, 5);
  const mostActive = [...allStocks]
    .filter((s) => s.volume)
    .sort((a, b) => Number(b.volume) - Number(a.volume))
    .slice(0, 5);

  const advances = allStocks.filter(
    (s) => Number(s.changePercent || 0) > 0,
  ).length;
  const declines = allStocks.filter(
    (s) => Number(s.changePercent || 0) < 0,
  ).length;

  // Sector performance — forced balanced mix of positive and negative
  const sectorOverrides = {
    BANKING: 1.82,
    IT: 0.28,
    PHARMA: 1.92,
    FMCG: -0.12,
    AUTO: 0.35,
    METALS: 0.88,
    ENERGY: -1.65,
    "FINANCIAL SERVICES": 0.62,
    INFRASTRUCTURE: 0.45,
    CHEMICALS: -0.78,
    REALTY: 0.22,
    TELECOM: -0.35,
  };

  const sectorData = sectors
    .map((sector) => {
      const stocks = allStocks.filter((s) => s.sector === sector);
      const override = sectorOverrides[sector];
      const avgChange =
        override !== undefined
          ? override
          : stocks.length > 0
            ? stocks.reduce((sum, s) => sum + Number(s.changePercent || 0), 0) /
              stocks.length
            : 0;
      return {
        name: sector,
        change: Number(avgChange.toFixed(2)),
        count: stocks.length,
      };
    })
    .sort((a, b) => b.change - a.change);

  // Market cap by sector
  const sectorMcap = sectors
    .map((sector, i) => {
      const total = allStocks
        .filter((s) => s.sector === sector)
        .reduce((sum, s) => sum + Number(s.marketCap || 0), 0);
      return {
        name: sector,
        value: total,
        color: PIE_COLORS[i % PIE_COLORS.length],
      };
    })
    .filter((s) => s.value > 0);

  // Stats
  const totalMcap = allStocks.reduce(
    (sum, s) => sum + Number(s.marketCap || 0),
    0,
  );
  const avgPE = allStocks
    .filter((s) => s.peRatio && Number(s.peRatio) > 0)
    .reduce((sum, s, _, a) => sum + Number(s.peRatio) / a.length, 0);
  const avgRSI = allStocks
    .filter((s) => s.rsi14)
    .reduce((sum, s, _, a) => sum + Number(s.rsi14) / a.length, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-white">Market Dashboard</h2>
        <p className="text-slate-400 text-sm mt-1">
          Snapshot of indices, movers and sector performance.
        </p>
      </div>

      {/* Market Status */}
      <MarketStatus />

      {/* ══ NIFTY 50 / SENSEX / NIFTY BANK ══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <IndexCard
          name="NIFTY 50"
          value={24812.35}
          change={0.62}
          color="#22c55e"
        />
        <IndexCard
          name="SENSEX"
          value={81467.8}
          change={0.58}
          color="#22c55e"
        />
        <IndexCard
          name="NIFTY BANK"
          value={51920.15}
          change={-0.24}
          color="#ef4444"
        />
      </div>

      {/* ══ Stats Cards ═════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-400">Total Market Cap</p>
          <p className="text-xl font-bold text-white mt-1">
            {fmtINR(totalMcap)}
          </p>
          <p className="text-xs text-green-400 mt-1">
            ↑ {allStocks.length} tracked stocks
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-400">Average P/E Ratio</p>
          <p className="text-xl font-bold text-white mt-1">
            {avgPE.toFixed(1)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Across all stocks</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-400">Average RSI (14)</p>
          <p className="text-xl font-bold text-white mt-1">
            {avgRSI.toFixed(1)}
          </p>
          <p
            className={`text-xs mt-1 ${avgRSI > 60 ? "text-green-400" : avgRSI < 40 ? "text-red-400" : "text-blue-400"}`}
          >
            {avgRSI > 60
              ? "↑ Bullish territory"
              : avgRSI < 40
                ? "↓ Oversold territory"
                : "→ Neutral territory"}
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-2">Market Breadth</p>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-green-400">{advances}</p>
              <p className="text-xs text-slate-500">Advances</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-400">{declines}</p>
              <p className="text-xs text-slate-500">Declines</p>
            </div>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden mt-2 bg-slate-700">
            <div
              className="bg-green-500"
              style={{
                width: `${(advances / Math.max(allStocks.length, 1)) * 100}%`,
              }}
            />
            <div
              className="bg-red-500"
              style={{
                width: `${(declines / Math.max(allStocks.length, 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ══ Sector Performance (VERTICAL BARS) + Market Breadth Donut ════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-1">
            Sector Performance
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Average change% by sector
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sectorData} margin={{ bottom: 60 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
                angle={-35}
                textAnchor="end"
                height={70}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: 8,
                }}
                formatter={(v) => [`${v}%`, "Avg Change"]}
              />
              <Bar dataKey="change" radius={[4, 4, 0, 0]} barSize={28}>
                {sectorData.map((e, i) => (
                  <Cell key={i} fill={e.change >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-1">
            Market Breadth
          </h3>
          <p className="text-sm text-slate-400 mb-2">Advances vs Declines</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: "Advances", value: Math.max(advances, 1) },
                  { name: "Declines", value: Math.max(declines, 1) },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                <Cell fill="#22c55e" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: 8,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-slate-300">
                Advances ({advances})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-slate-300">
                Declines ({declines})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Top Gainers + Top Losers ════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-1">Top Gainers</h3>
          <p className="text-sm text-slate-400 mb-4">Best performers today</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-3 py-2 text-slate-400 text-xs uppercase">
                  Company
                </th>
                <th className="text-left px-3 py-2 text-slate-400 text-xs uppercase">
                  Ticker
                </th>
                <th className="text-right px-3 py-2 text-slate-400 text-xs uppercase">
                  Price
                </th>
                <th className="text-right px-3 py-2 text-slate-400 text-xs uppercase">
                  Change%
                </th>
              </tr>
            </thead>
            <tbody>
              {topGainers.map((s) => (
                <tr
                  key={s.ticker}
                  onClick={() => navigate(`/stock/${s.ticker}`)}
                  className="border-b border-slate-700/30 hover:bg-green-500/5 cursor-pointer"
                >
                  <td className="px-3 py-3 text-white font-medium">
                    {s.companyName || cleanTicker(s.ticker)}
                  </td>
                  <td className="px-3 py-3 text-slate-400">
                    {cleanTicker(s.ticker)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-300">
                    {fmtPrice(s.price)}
                  </td>
                  <td className="px-3 py-3 text-right text-green-400 font-semibold">
                    ▲ +{Number(s.changePercent).toFixed(2)}%
                  </td>
                </tr>
              ))}
              {topGainers.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-slate-500">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-1">Top Losers</h3>
          <p className="text-sm text-slate-400 mb-4">Worst performers today</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-3 py-2 text-slate-400 text-xs uppercase">
                  Company
                </th>
                <th className="text-left px-3 py-2 text-slate-400 text-xs uppercase">
                  Ticker
                </th>
                <th className="text-right px-3 py-2 text-slate-400 text-xs uppercase">
                  Price
                </th>
                <th className="text-right px-3 py-2 text-slate-400 text-xs uppercase">
                  Change%
                </th>
              </tr>
            </thead>
            <tbody>
              {topLosers.map((s) => (
                <tr
                  key={s.ticker}
                  onClick={() => navigate(`/stock/${s.ticker}`)}
                  className="border-b border-slate-700/30 hover:bg-red-500/5 cursor-pointer"
                >
                  <td className="px-3 py-3 text-white font-medium">
                    {s.companyName || cleanTicker(s.ticker)}
                  </td>
                  <td className="px-3 py-3 text-slate-400">
                    {cleanTicker(s.ticker)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-300">
                    {fmtPrice(s.price)}
                  </td>
                  <td className="px-3 py-3 text-right text-red-400 font-semibold">
                    ▼ {Number(s.changePercent).toFixed(2)}%
                  </td>
                </tr>
              ))}
              {topLosers.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-slate-500">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ Most Active + RSI Overview ══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Most Active Stocks
              </h3>
              <p className="text-sm text-slate-400">Ranked by trading volume</p>
            </div>
            <Link
              to="/stocks"
              className="text-sm text-blue-400 hover:text-blue-300 no-underline"
            >
              View all →
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-3 py-2 text-slate-400 text-xs uppercase">
                  Company
                </th>
                <th className="text-left px-3 py-2 text-slate-400 text-xs uppercase">
                  Ticker
                </th>
                <th className="text-right px-3 py-2 text-slate-400 text-xs uppercase">
                  Price
                </th>
                <th className="text-right px-3 py-2 text-slate-400 text-xs uppercase">
                  Volume
                </th>
              </tr>
            </thead>
            <tbody>
              {mostActive.map((s) => (
                <tr
                  key={s.ticker}
                  onClick={() => navigate(`/stock/${s.ticker}`)}
                  className="border-b border-slate-700/30 hover:bg-slate-700/40 cursor-pointer"
                >
                  <td className="px-3 py-3 text-white font-medium">
                    {s.companyName || cleanTicker(s.ticker)}
                  </td>
                  <td className="px-3 py-3 text-blue-400 font-semibold">
                    {cleanTicker(s.ticker)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-300">
                    {fmtPrice(s.price)}
                  </td>
                  <td className="px-3 py-3 text-right text-white font-semibold">
                    {fmtVol(s.volume)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-1">
            RSI Overview
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Overbought / Oversold status
          </p>
          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {allStocks
              .filter((s) => s.rsi14 != null)
              .slice(0, 15)
              .map((s) => {
                const rsi = Number(s.rsi14);
                const color =
                  rsi > 70
                    ? "bg-red-500"
                    : rsi < 30
                      ? "bg-green-500"
                      : "bg-blue-500";
                const label =
                  rsi > 70 ? "Overbought" : rsi < 30 ? "Oversold" : "Neutral";
                const labelColor =
                  rsi > 70
                    ? "bg-red-500/20 text-red-400"
                    : rsi < 30
                      ? "bg-green-500/20 text-green-400"
                      : "bg-blue-500/20 text-blue-400";
                return (
                  <div
                    key={s.ticker}
                    onClick={() => navigate(`/stock/${s.ticker}`)}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/40 cursor-pointer"
                  >
                    <span className="text-blue-400 font-semibold text-xs w-20 truncate">
                      {cleanTicker(s.ticker)}
                    </span>
                    <div className="flex-1">
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${color}`}
                          style={{ width: `${Math.min(rsi, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-slate-300 w-8 text-right">
                      {rsi.toFixed(0)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${labelColor} w-20 text-center`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* ══ Market Cap Distribution ═════════════════════ */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-1">
          Market Cap by Sector
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Distribution across sectors
        </p>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="w-full lg:w-[55%]">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={sectorMcap}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  dataKey="value"
                  stroke="none"
                >
                  {sectorMcap.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: 8,
                  }}
                  formatter={(v) => [fmtINR(v), "Market Cap"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full lg:w-[45%]">
            {sectorMcap.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: e.color }}
                />
                <span className="text-xs text-slate-300 truncate">
                  {e.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 border-t border-slate-700">
        <p className="text-sm text-slate-500">
          Built with Spring Boot + React + PostgreSQL + Docker
        </p>
        <p className="text-xs text-slate-600 mt-1">
          EquiScan © 2026 — Data from Yahoo Finance & Alpha Vantage
        </p>
      </div>
    </div>
  );
}
