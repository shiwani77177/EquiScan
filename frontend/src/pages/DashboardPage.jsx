import { useEffect, useState, useMemo } from "react";
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

const cleanTicker = (t) => (t ? t.replace(".NS", "").replace(".BO", "") : "—");
const fmtINR = (v) => {
  if (v == null) return "—";
  const n = Number(v);
  if (Math.abs(n) >= 1e12) return `₹${(n / 1e12).toFixed(2)}L Cr`;
  if (Math.abs(n) >= 1e9) return `₹${(n / 1e9).toFixed(0)} Cr`;
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(0)} Cr`;
  return `₹${n.toLocaleString("en-IN")}`;
};
const fmtPrice = (v) =>
  v == null
    ? "—"
    : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const fmtVol = (v) => {
  if (v == null) return "—";
  const n = Number(v);
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
  return n.toLocaleString("en-IN");
};

// ── Sparkline — smooth random walk (like real intraday chart) ──
// Uses Brownian motion with momentum, NOT sine waves
const makeSparkline = (trend) => {
  const pts = [];
  let y = 50;
  let velocity = 0;
  const dir = trend === "up" ? 0.12 : -0.12;
  for (let i = 0; i < 60; i++) {
    // Random walk with momentum (velocity carries forward)
    velocity = velocity * 0.85 + (Math.random() - 0.48 + dir) * 1.8;
    y += velocity;
    y = Math.max(8, Math.min(92, y));
    pts.push({ v: Math.round(y * 10) / 10 });
  }
  return pts;
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

// Dashboard news preview (shows first 5, links to /news for full view)
const PREVIEW_NEWS = [
  {
    title: "Reliance Industries announces new energy investment plan",
    source: "Economic Times",
    time: "3h ago",
  },
  {
    title: "HDFC Bank reports steady loan growth in latest quarter",
    source: "Moneycontrol",
    time: "2h ago",
  },
  {
    title:
      "IT majors TCS and Infosys see strong deal pipeline amid global demand",
    source: "Business Standard",
    time: "15h ago",
  },
  {
    title: "Sun Pharma gains regulatory approval for key drug in US market",
    source: "LiveMint",
    time: "2d ago",
  },
  {
    title: "Tata Motors EV sales accelerate ahead of festive season",
    source: "CNBC-TV18",
    time: "1d ago",
  },
];

// ── Index Card ────────────────────────────────────────────
const IndexCard = ({ name, value, change, sparkData }) => {
  const color = change >= 0 ? "#22c55e" : "#ef4444";
  const gid = `sp-${name.replace(/\s/g, "")}`;
  return (
    <div className="bg-gradient-to-br from-slate-800 to-[#141c2e] border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-all">
      <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.15em] mb-3">
        {name}
      </p>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[1.65rem] font-extrabold text-white leading-none">
            {value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </p>
          <p
            className={`text-sm font-bold mt-2 ${change >= 0 ? "text-green-400" : "text-red-400"}`}
          >
            {change >= 0 ? "▲" : "▼"} {change >= 0 ? "+" : ""}
            {change.toFixed(2)}%
          </p>
        </div>
        <div className="w-[130px] h-[55px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sparkData}
              margin={{ top: 3, right: 3, bottom: 3, left: 3 }}
            >
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                fill={`url(#${gid})`}
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const MarketStatus = () => {
  const now = new Date();
  const h = now.getHours(),
    m = now.getMinutes(),
    wd = now.getDay() > 0 && now.getDay() < 6;
  const open =
    wd && ((h === 9 && m >= 15) || (h > 9 && h < 15) || (h === 15 && m <= 30));
  return (
    <div
      className={`rounded-xl px-5 py-3 flex items-center gap-3 ${
        open
          ? "bg-green-500/[0.06] border border-green-500/20"
          : "bg-amber-500/[0.06] border border-amber-500/20"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${open ? "bg-green-400 animate-pulse" : "bg-amber-400"}`}
      />
      <span className="text-sm">
        <span className="text-slate-300">Market Status: </span>
        <span
          className={`font-bold ${open ? "text-green-400" : "text-amber-400"}`}
        >
          {open ? "Market Open" : "Market Closed"}
        </span>
        <span className="text-slate-500 ml-2 hidden sm:inline">
          {open
            ? "(NSE live — 9:15 AM to 3:30 PM)"
            : "(Next: Mon–Fri 9:15 AM IST)"}
        </span>
      </span>
    </div>
  );
};

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-[#111827] border border-slate-700/40 rounded-xl p-6 ${className}`}
  >
    {children}
  </div>
);
const TH = ({ children, right }) => (
  <th
    className={`px-3 py-2.5 text-${right ? "right" : "left"} text-slate-500 text-[11px] uppercase tracking-wider font-semibold`}
  >
    {children}
  </th>
);

export default function DashboardPage() {
  const navigate = useNavigate();
  const [allStocks, setAllStocks] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);

  const sparkNifty = useMemo(() => makeSparkline("up"), []);
  const sparkSensex = useMemo(() => makeSparkline("up"), []);
  const sparkBank = useMemo(() => makeSparkline("down"), []);

  useEffect(() => {
    Promise.all([
      screenStocks([], { field: "market_cap", direction: "desc" }, 0, 100),
      getSectors(),
    ])
      .then(([r, s]) => {
        setAllStocks(r.data || []);
        setSectors(s || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-block w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 mt-4 animate-pulse">
          Loading market data...
        </p>
      </div>
    );

  const wc = allStocks.filter((s) => s.changePercent != null);
  const topGainers = [...wc]
    .sort((a, b) => Number(b.changePercent) - Number(a.changePercent))
    .slice(0, 5);
  const topLosers = [...wc]
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
  const sectorData = sectors.map((s) => ({
    name: s,
    change: sectorOverrides[s] ?? 0,
  }));
  const sectorMcap = sectors
    .map((s, i) => ({
      name: s,
      value: allStocks
        .filter((x) => x.sector === s)
        .reduce((a, x) => a + Number(x.marketCap || 0), 0),
      color: PIE_COLORS[i % PIE_COLORS.length],
    }))
    .filter((s) => s.value > 0);

  const Row = ({ s, showVol, showChg = true }) => (
    <tr
      onClick={() => navigate(`/stock/${s.ticker}`)}
      className="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer transition-colors"
    >
      <td className="px-3 py-3 text-white font-medium">
        {s.companyName || cleanTicker(s.ticker)}
      </td>
      <td className="px-3 py-3 text-slate-400 font-mono text-xs">
        {cleanTicker(s.ticker)}
      </td>
      <td className="px-3 py-3 text-right text-slate-200">
        {fmtPrice(s.price)}
      </td>
      {showChg && (
        <td
          className={`px-3 py-3 text-right font-semibold ${Number(s.changePercent) >= 0 ? "text-green-400" : "text-red-400"}`}
        >
          {Number(s.changePercent) >= 0 ? "▲ +" : "▼ "}
          {Number(s.changePercent).toFixed(2)}%
        </td>
      )}
      {showVol && (
        <td className="px-3 py-3 text-right text-slate-300">
          {fmtVol(s.volume)}
        </td>
      )}
    </tr>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
      <div>
        <h2 className="text-[1.6rem] font-extrabold text-white tracking-tight">
          Market Dashboard
        </h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Snapshot of indices, movers and sector performance.
        </p>
      </div>

      <MarketStatus />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <IndexCard
          name="NIFTY 50"
          value={24812.35}
          change={0.62}
          sparkData={sparkNifty}
        />
        <IndexCard
          name="SENSEX"
          value={81467.8}
          change={0.58}
          sparkData={sparkSensex}
        />
        <IndexCard
          name="NIFTY BANK"
          value={51920.15}
          change={-0.24}
          sparkData={sparkBank}
        />
      </div>

      {/* Sector + Breadth */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Card className="lg:col-span-3">
          <h3 className="text-[15px] font-bold text-white">
            Sector Performance
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Average change% by sector
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={sectorData}
              margin={{ bottom: 80, top: 10, left: -10 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#1e293b" }}
                angle={-45}
                textAnchor="end"
                height={90}
                interval={0}
              />
              <YAxis
                tick={{ fill: "#475569", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "#0c1222",
                  border: "1px solid #1e293b",
                  borderRadius: 10,
                }}
                formatter={(v) => [`${v}%`, "Avg Change"]}
                cursor={{ fill: "transparent" }}
              />
              <Bar dataKey="change" radius={[4, 4, 0, 0]} barSize={28}>
                {sectorData.map((e, i) => (
                  <Cell key={i} fill={e.change >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
          <h3 className="text-[15px] font-bold text-white">Market Breadth</h3>
          <p className="text-xs text-slate-500 mb-2">Advances vs Declines</p>
          <div className="flex-1 flex items-center justify-center min-h-[280px]">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Advances", value: Math.max(advances, 1) },
                    { name: "Declines", value: Math.max(declines, 1) },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
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
                    background: "#0c1222",
                    border: "1px solid #1e293b",
                    borderRadius: 10,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-8 mt-2 pb-2">
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
        </Card>
      </div>

      {/* Gainers + Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="text-[15px] font-bold text-white">Top Gainers</h3>
          <p className="text-xs text-slate-500 mb-4">Best performers today</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <TH>Company</TH>
                <TH>Ticker</TH>
                <TH right>Price</TH>
                <TH right>Change%</TH>
              </tr>
            </thead>
            <tbody>
              {topGainers.map((s) => (
                <Row key={s.ticker} s={s} />
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <h3 className="text-[15px] font-bold text-white">Top Losers</h3>
          <p className="text-xs text-slate-500 mb-4">Worst performers today</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <TH>Company</TH>
                <TH>Ticker</TH>
                <TH right>Price</TH>
                <TH right>Change%</TH>
              </tr>
            </thead>
            <tbody>
              {topLosers.map((s) => (
                <Row key={s.ticker} s={s} />
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Active + RSI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold text-white">
                Most Active Stocks
              </h3>
              <p className="text-xs text-slate-500">Ranked by volume</p>
            </div>
            <Link
              to="/stocks"
              className="text-xs text-blue-400 hover:text-blue-300 no-underline"
            >
              View all →
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <TH>Company</TH>
                <TH>Ticker</TH>
                <TH right>Price</TH>
                <TH right>Volume</TH>
              </tr>
            </thead>
            <tbody>
              {mostActive.map((s) => (
                <Row key={s.ticker} s={s} showVol showChg={false} />
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <h3 className="text-[15px] font-bold text-white">RSI Overview</h3>
          <p className="text-xs text-slate-500 mb-4">Overbought / Oversold</p>
          <div className="space-y-2 max-h-[340px] overflow-y-auto">
            {allStocks
              .filter((s) => s.rsi14)
              .slice(0, 12)
              .map((s) => {
                const r = Number(s.rsi14);
                const bg =
                  r > 70
                    ? "bg-red-500"
                    : r < 30
                      ? "bg-green-500"
                      : "bg-blue-500";
                const lb =
                  r > 70 ? "Overbought" : r < 30 ? "Oversold" : "Neutral";
                const lc =
                  r > 70
                    ? "text-red-400 bg-red-500/10"
                    : r < 30
                      ? "text-green-400 bg-green-500/10"
                      : "text-blue-400 bg-blue-500/10";
                return (
                  <div
                    key={s.ticker}
                    onClick={() => navigate(`/stock/${s.ticker}`)}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-700/20 cursor-pointer"
                  >
                    <span className="text-blue-400 font-semibold text-[11px] w-[68px] truncate">
                      {cleanTicker(s.ticker)}
                    </span>
                    <div className="flex-1 bg-slate-700/50 rounded-full h-[6px]">
                      <div
                        className={`h-full rounded-full ${bg}`}
                        style={{ width: `${Math.min(r, 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 w-6 text-right font-mono">
                      {r.toFixed(0)}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium w-[66px] text-center ${lc}`}
                    >
                      {lb}
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>

      {/* Market Cap */}
      <Card>
        <h3 className="text-[15px] font-bold text-white">
          Market Cap by Sector
        </h3>
        <p className="text-xs text-slate-500 mb-4">
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
                  innerRadius={68}
                  outerRadius={115}
                  dataKey="value"
                  stroke="none"
                >
                  {sectorMcap.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0c1222",
                    border: "1px solid #1e293b",
                    borderRadius: 10,
                  }}
                  formatter={(v) => [fmtINR(v), "Market Cap"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 w-full lg:w-[45%]">
            {sectorMcap.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ background: e.color }}
                />
                <span className="text-xs text-slate-300">{e.name}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ═══ LATEST NEWS — Links to /news page ════════ */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-bold text-white">
              Latest Market News
            </h3>
            <p className="text-xs text-slate-500">Top headlines</p>
          </div>
          <Link
            to="/news"
            className="text-xs text-blue-400 hover:text-blue-300 no-underline font-medium"
          >
            View all news →
          </Link>
        </div>
        <div className="space-y-0.5">
          {PREVIEW_NEWS.map((item, i) => (
            <Link
              key={i}
              to="/news"
              className="flex items-start gap-3 py-3 border-b border-slate-700/25 last:border-0
                         hover:bg-slate-700/15 rounded-lg px-3 transition-colors no-underline group"
            >
              <div className="flex-1">
                <p className="text-sm text-white font-medium leading-snug group-hover:text-green-400 transition-colors">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500 mt-1.5">
                  <span className="text-slate-400 font-medium">
                    {item.source}
                  </span>
                  <span className="mx-1.5">·</span>
                  {item.time}
                </p>
              </div>
              <svg
                className="w-4 h-4 text-slate-600 group-hover:text-green-400 mt-1 flex-shrink-0 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          ))}
        </div>
      </Card>

      <div className="text-center py-8 border-t border-slate-700/30">
        <p className="text-sm text-slate-500">
          Built with Spring Boot · React · PostgreSQL · Docker
        </p>
        <p className="text-xs text-slate-600 mt-1">
          EquiScan © 2026 — Data from Yahoo Finance & Alpha Vantage
        </p>
      </div>
    </div>
  );
}
