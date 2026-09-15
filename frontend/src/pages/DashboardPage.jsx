import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  LineChart,
  Line,
} from "recharts";

// ── Number formatters ──────────────────────────────────────
const fmtCurrency = (v) => {
  if (v == null) return "—";
  const n = Number(v);
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
};
const fmtNum = (v, d = 2) => (v == null ? "—" : Number(v).toFixed(d));
const fmtPct = (v) => {
  if (v == null) return "—";
  const n = Number(v);
  return `${n >= 0 ? "▲" : "▼"} ${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};
const fmtVol = (v) => {
  if (v == null) return "—";
  const n = Number(v);
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString();
};

// ── Mini sparkline chart (fake trend for visual appeal) ──
const Sparkline = ({ trend = "up", color }) => {
  const data =
    trend === "up"
      ? [
          { v: 30 },
          { v: 35 },
          { v: 32 },
          { v: 40 },
          { v: 38 },
          { v: 45 },
          { v: 50 },
        ]
      : [
          { v: 50 },
          { v: 45 },
          { v: 48 },
          { v: 40 },
          { v: 42 },
          { v: 35 },
          { v: 30 },
        ];

  return (
    <ResponsiveContainer width={80} height={40}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// ── Pie chart colors ─────────────────────────────────────
const PIE_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [allStocks, setAllStocks] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      screenStocks([], { field: "market_cap", direction: "desc" }, 0, 50),
      getSectors(),
    ])
      .then(([screenResult, sectorList]) => {
        setAllStocks(screenResult.data || []);
        setSectors(sectorList || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 mt-4">Loading market data...</p>
      </div>
    );
  }

  // ── Derived data ────────────────────────────────────────
  const topByMarketCap = [...allStocks]
    .sort((a, b) => Number(b.marketCap || 0) - Number(a.marketCap || 0))
    .slice(0, 5);
  const topGainers = [...allStocks]
    .filter((s) => s.changePercent != null)
    .sort((a, b) => Number(b.changePercent) - Number(a.changePercent))
    .slice(0, 5);
  const topLosers = [...allStocks]
    .filter((s) => s.changePercent != null)
    .sort((a, b) => Number(a.changePercent) - Number(b.changePercent))
    .slice(0, 5);
  const mostActive = [...allStocks]
    .filter((s) => s.volume != null)
    .sort((a, b) => Number(b.volume) - Number(a.volume))
    .slice(0, 5);
  const advances = allStocks.filter(
    (s) => Number(s.changePercent || 0) > 0,
  ).length;
  const declines = allStocks.filter(
    (s) => Number(s.changePercent || 0) < 0,
  ).length;
  const unchanged = allStocks.length - advances - declines;

  // Sector data for bar chart
  const sectorData = sectors.map((sector) => {
    const sectorStocks = allStocks.filter((s) => s.sector === sector);
    const avgChange =
      sectorStocks.length > 0
        ? sectorStocks.reduce(
            (sum, s) => sum + Number(s.changePercent || 0),
            0,
          ) / sectorStocks.length
        : 0;
    return {
      name: sector,
      change: Number(avgChange.toFixed(2)),
      count: sectorStocks.length,
    };
  });

  // Market cap distribution for pie chart
  const sectorMarketCap = sectors
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

  // Total market cap
  const totalMarketCap = allStocks.reduce(
    (sum, s) => sum + Number(s.marketCap || 0),
    0,
  );
  const avgPE = allStocks
    .filter((s) => s.peRatio != null)
    .reduce((sum, s, _, a) => sum + Number(s.peRatio) / a.length, 0);
  const avgRSI = allStocks
    .filter((s) => s.rsi14 != null)
    .reduce((sum, s, _, a) => sum + Number(s.rsi14) / a.length, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* ── Page Title ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Market Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">
            Snapshot of indices, movers and sector performance.
          </p>
        </div>
        <span className="text-xs text-yellow-400 bg-yellow-400/10 px-3 py-1.5 rounded-lg border border-yellow-400/30">
          Seed data — not live market data
        </span>
      </div>

      {/* ── Market Overview Cards ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Market Cap */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-xs text-slate-400 mb-1">Total Market Cap</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-white">
              {fmtCurrency(totalMarketCap)}
            </p>
            <Sparkline trend="up" color="#3b82f6" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {allStocks.length} tracked stocks
          </p>
        </div>

        {/* Avg P/E */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-xs text-slate-400 mb-1">Average P/E Ratio</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-white">{avgPE.toFixed(1)}</p>
            <Sparkline trend="up" color="#8b5cf6" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Across all tracked stocks
          </p>
        </div>

        {/* Avg RSI */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-xs text-slate-400 mb-1">Average RSI (14)</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-white">{avgRSI.toFixed(1)}</p>
            <Sparkline trend={avgRSI > 50 ? "up" : "down"} color="#06b6d4" />
          </div>
          <p
            className={`text-xs mt-2 ${avgRSI > 70 ? "text-red-400" : avgRSI < 30 ? "text-green-400" : "text-slate-500"}`}
          >
            {avgRSI > 70
              ? "Overbought territory"
              : avgRSI < 30
                ? "Oversold territory"
                : "Neutral territory"}
          </p>
        </div>

        {/* Market Breadth */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-xs text-slate-400 mb-1">Market Breadth</p>
          <div className="flex items-center gap-4 mt-2">
            <div className="text-center">
              <p className="text-xl font-bold text-green-400">{advances}</p>
              <p className="text-xs text-slate-500">Advances</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-red-400">{declines}</p>
              <p className="text-xs text-slate-500">Declines</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-400">{unchanged}</p>
              <p className="text-xs text-slate-500">Unchanged</p>
            </div>
          </div>
          {/* Mini breadth bar */}
          <div className="flex h-2 rounded-full overflow-hidden mt-3 bg-slate-700">
            <div
              className="bg-green-500 transition-all"
              style={{
                width: `${(advances / Math.max(allStocks.length, 1)) * 100}%`,
              }}
            />
            <div
              className="bg-red-500 transition-all"
              style={{
                width: `${(declines / Math.max(allStocks.length, 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Sector Performance + Market Cap Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Performance */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-1">
            Sector Performance
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Average change% by sector
          </p>
          {sectorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sectorData}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
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
                <Bar dataKey="change" radius={[4, 4, 0, 0]}>
                  {sectorData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.change >= 0 ? "#22c55e" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-12">
              No sector data available
            </p>
          )}
        </div>

        {/* Market Cap Distribution */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-1">
            Market Cap Distribution
          </h3>
          <p className="text-sm text-slate-400 mb-4">By sector</p>
          {sectorMarketCap.length > 0 ? (
            <div className="flex items-center">
              <ResponsiveContainer width="60%" height={250}>
                <PieChart>
                  <Pie
                    data={sectorMarketCap}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    stroke="none"
                  >
                    {sectorMarketCap.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: 8,
                    }}
                    formatter={(v) => [fmtCurrency(v), "Market Cap"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 w-[40%]">
                {sectorMarketCap.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: entry.color }}
                    />
                    <span className="text-xs text-slate-300 truncate">
                      {entry.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-12">
              No data available
            </p>
          )}
        </div>
      </div>

      {/* ── Top Stocks by Market Cap ──────────────────── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Top Stocks by Market Cap
            </h3>
            <p className="text-sm text-slate-400">Largest companies tracked</p>
          </div>
          <Link
            to="/screener"
            className="text-sm text-blue-400 hover:text-blue-300 no-underline"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">
                  Company
                </th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">
                  Ticker
                </th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">
                  Price
                </th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">
                  Change%
                </th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">
                  Market Cap
                </th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">
                  P/E
                </th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">
                  Volume
                </th>
              </tr>
            </thead>
            <tbody>
              {topByMarketCap.map((stock) => (
                <tr
                  key={stock.ticker}
                  onClick={() => navigate(`/stock/${stock.ticker}`)}
                  className="border-b border-slate-700/50 hover:bg-slate-700/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-white font-medium">
                    {stock.companyName || "—"}
                  </td>
                  <td className="px-4 py-3 text-blue-400 font-semibold">
                    {stock.ticker}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {stock.price != null ? `$${fmtNum(stock.price)}` : "—"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      Number(stock.changePercent || 0) >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {fmtPct(stock.changePercent)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {fmtCurrency(stock.marketCap)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {fmtNum(stock.peRatio)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {fmtVol(stock.volume)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Top Gainers + Top Losers ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-1">Top Gainers</h3>
          <p className="text-sm text-slate-400 mb-4">Best performers today</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-3 py-2 text-slate-400 font-medium text-xs uppercase">
                    Company
                  </th>
                  <th className="text-left px-3 py-2 text-slate-400 font-medium text-xs uppercase">
                    Ticker
                  </th>
                  <th className="text-right px-3 py-2 text-slate-400 font-medium text-xs uppercase">
                    Price
                  </th>
                  <th className="text-right px-3 py-2 text-slate-400 font-medium text-xs uppercase">
                    Change%
                  </th>
                </tr>
              </thead>
              <tbody>
                {topGainers.map((s) => (
                  <tr
                    key={s.ticker}
                    onClick={() => navigate(`/stock/${s.ticker}`)}
                    className="border-b border-slate-700/30 hover:bg-slate-700/40 cursor-pointer"
                  >
                    <td className="px-3 py-2.5 text-white font-medium">
                      {s.companyName || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">{s.ticker}</td>
                    <td className="px-3 py-2.5 text-right text-slate-300">
                      {s.price != null ? `$${fmtNum(s.price)}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-green-400 font-semibold">
                      {fmtPct(s.changePercent)}
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
        </div>

        {/* Top Losers */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-1">Top Losers</h3>
          <p className="text-sm text-slate-400 mb-4">Worst performers today</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-3 py-2 text-slate-400 font-medium text-xs uppercase">
                    Company
                  </th>
                  <th className="text-left px-3 py-2 text-slate-400 font-medium text-xs uppercase">
                    Ticker
                  </th>
                  <th className="text-right px-3 py-2 text-slate-400 font-medium text-xs uppercase">
                    Price
                  </th>
                  <th className="text-right px-3 py-2 text-slate-400 font-medium text-xs uppercase">
                    Change%
                  </th>
                </tr>
              </thead>
              <tbody>
                {topLosers.map((s) => (
                  <tr
                    key={s.ticker}
                    onClick={() => navigate(`/stock/${s.ticker}`)}
                    className="border-b border-slate-700/30 hover:bg-slate-700/40 cursor-pointer"
                  >
                    <td className="px-3 py-2.5 text-white font-medium">
                      {s.companyName || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">{s.ticker}</td>
                    <td className="px-3 py-2.5 text-right text-slate-300">
                      {s.price != null ? `$${fmtNum(s.price)}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-red-400 font-semibold">
                      {fmtPct(s.changePercent)}
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
      </div>

      {/* ── Most Active + RSI Heatmap ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Active */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-1">
            Most Active Stocks
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Ranked by trading volume
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-3 py-2 text-slate-400 font-medium text-xs uppercase">
                    Company
                  </th>
                  <th className="text-left px-3 py-2 text-slate-400 font-medium text-xs uppercase">
                    Ticker
                  </th>
                  <th className="text-right px-3 py-2 text-slate-400 font-medium text-xs uppercase">
                    Price
                  </th>
                  <th className="text-right px-3 py-2 text-slate-400 font-medium text-xs uppercase">
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
                    <td className="px-3 py-2.5 text-white font-medium">
                      {s.companyName || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">{s.ticker}</td>
                    <td className="px-3 py-2.5 text-right text-slate-300">
                      {s.price != null ? `$${fmtNum(s.price)}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-white font-semibold">
                      {fmtVol(s.volume)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RSI Overview */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-1">
            RSI Overview
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Overbought / Oversold status
          </p>
          <div className="space-y-3">
            {allStocks
              .filter((s) => s.rsi14 != null)
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
                return (
                  <div
                    key={s.ticker}
                    onClick={() => navigate(`/stock/${s.ticker}`)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/60 cursor-pointer transition-colors"
                  >
                    <span className="text-blue-400 font-semibold w-16">
                      {s.ticker}
                    </span>
                    <div className="flex-1">
                      <div className="w-full bg-slate-700 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${color} transition-all`}
                          style={{ width: `${Math.min(rsi, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-slate-300 w-12 text-right">
                      {rsi.toFixed(0)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        rsi > 70
                          ? "bg-red-500/20 text-red-400"
                          : rsi < 30
                            ? "bg-green-500/20 text-green-400"
                            : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            {allStocks.filter((s) => s.rsi14 != null).length === 0 && (
              <p className="text-slate-500 text-center py-6">
                No RSI data available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────── */}
      <div className="text-center py-6 border-t border-slate-700">
        <p className="text-sm text-slate-500">
          Built with Spring Boot + React + PostgreSQL + Docker
        </p>
        <p className="text-xs text-slate-600 mt-1">
          EquiScan © 2026 — Data from Alpha Vantage
        </p>
      </div>
    </div>
  );
}
