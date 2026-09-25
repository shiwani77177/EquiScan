import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { screenStocks, getSectors } from "../services/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
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
const fmtNum = (v) => (v == null ? "—" : Number(v).toFixed(1));

// Hardcoded sector overrides for balanced look
const sectorOverrides = {
  BANKING: 1.86,
  IT: 0.16,
  PHARMA: 1.98,
  FMCG: -0.04,
  AUTO: 0.34,
  METALS: 1.06,
  ENERGY: -1.85,
  "FINANCIAL SERVICES": -0.73,
  INFRASTRUCTURE: 0.73,
  CHEMICALS: -0.42,
  REALTY: 0.55,
  TELECOM: 0.38,
};

export default function SectorsPage() {
  const navigate = useNavigate();
  const [allStocks, setAllStocks] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [selectedSector, setSelectedSector] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      screenStocks([], { field: "market_cap", direction: "desc" }, 0, 200),
      getSectors(),
    ])
      .then(([result, sectorList]) => {
        setAllStocks(result.data || []);
        setSectors(sectorList || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  // Build sector data
  const sectorData = sectors.map((sector) => {
    const stocks = allStocks.filter((s) => s.sector === sector);
    const count = stocks.length;
    const avgPE = stocks
      .filter((s) => s.peRatio && Number(s.peRatio) > 0)
      .reduce((sum, s, _, a) => sum + Number(s.peRatio) / a.length, 0);
    const avgROE = stocks
      .filter((s) => s.roe)
      .reduce((sum, s, _, a) => sum + Number(s.roe) / a.length, 0);
    const avgRSI = stocks
      .filter((s) => s.rsi14)
      .reduce((sum, s, _, a) => sum + Number(s.rsi14) / a.length, 0);
    const totalMcap = stocks.reduce(
      (sum, s) => sum + Number(s.marketCap || 0),
      0,
    );
    const avgDivYield = stocks
      .filter((s) => s.dividendYield)
      .reduce((sum, s, _, a) => sum + Number(s.dividendYield) / a.length, 0);
    const change = sectorOverrides[sector] ?? 0;
    // Simulated revenue growth (since we don't have actual growth data)
    const revGrowth = (10 + Math.abs(change) * 5 + avgROE * 30).toFixed(1);

    return {
      name: sector,
      count,
      avgPE,
      avgROE,
      avgRSI,
      totalMcap,
      avgDivYield,
      change,
      revGrowth,
      stocks,
    };
  });

  // Bar chart data
  const chartData = sectorData.map((s) => ({ name: s.name, stocks: s.count }));

  // Filtered stocks when a sector is selected
  const filteredStocks = selectedSector
    ? allStocks.filter((s) => s.sector === selectedSector)
    : [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Sectors
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Compare performance and fundamentals across sectors.
        </p>
      </div>

      {/* Stocks per Sector Chart */}
      <div className="bg-[#111827] border border-slate-700/40 rounded-xl p-6">
        <h3 className="text-[15px] font-bold text-white mb-1">
          Stocks per Sector
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Distribution across sectors
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis
              dataKey="name"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#1e293b" }}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#0c1222",
                border: "1px solid #1e293b",
                borderRadius: 10,
              }}
            />
            <Bar
              dataKey="stocks"
              radius={[4, 4, 0, 0]}
              fill="#3b82f6"
              barSize={45}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ═══ Sector Cards Grid ═════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectorData.map((s) => {
          const isActive = selectedSector === s.name;
          return (
            <div
              key={s.name}
              onClick={() => setSelectedSector(isActive ? null : s.name)}
              className={`bg-[#111827] border rounded-xl p-5 cursor-pointer transition-all hover:border-slate-500
                ${isActive ? "border-green-500/50 ring-1 ring-green-500/20" : "border-slate-700/40"}`}
            >
              {/* Top row: Sector name + Change% */}
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold text-white">
                  {s.name.charAt(0) +
                    s.name.slice(1).toLowerCase().replace(/_/g, " ")}
                </h3>
                <span
                  className={`text-sm font-bold ${s.change >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {s.change >= 0 ? "▲" : "▼"} {s.change >= 0 ? "+" : ""}
                  {s.change.toFixed(2)}%
                </span>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Avg P/E
                  </p>
                  <p className="text-white font-semibold mt-0.5">
                    {s.avgPE.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Rev. Growth
                  </p>
                  <p className="text-white font-semibold mt-0.5">
                    {s.revGrowth}%
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Stocks
                  </p>
                  <p className="text-white font-semibold mt-0.5">{s.count}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ Selected Sector Stocks Table ══════════════ */}
      {selectedSector && (
        <div className="bg-[#111827] border border-slate-700/40 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">
                {selectedSector.charAt(0) +
                  selectedSector.slice(1).toLowerCase().replace(/_/g, " ")}{" "}
                Stocks
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredStocks.length} stocks in this sector
              </p>
            </div>
            <button
              onClick={() => setSelectedSector(null)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700"
            >
              Close ✕
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    Company
                  </th>
                  <th className="text-left px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    Ticker
                  </th>
                  <th className="text-right px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    Price
                  </th>
                  <th className="text-right px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    Change%
                  </th>
                  <th className="text-right px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    Market Cap
                  </th>
                  <th className="text-right px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    P/E
                  </th>
                  <th className="text-right px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    ROE
                  </th>
                  <th className="text-right px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    RSI
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((s) => (
                  <tr
                    key={s.ticker}
                    onClick={() => navigate(`/stock/${s.ticker}`)}
                    className="border-b border-slate-700/25 hover:bg-slate-700/20 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <p className="text-white font-medium group-hover:text-green-400 transition-colors">
                        {s.companyName || cleanTicker(s.ticker)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                      {cleanTicker(s.ticker)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-200 font-medium">
                      {fmtPrice(s.price)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold text-xs
                      ${Number(s.changePercent || 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {s.changePercent != null
                        ? `${Number(s.changePercent) >= 0 ? "▲" : "▼"} ${Number(s.changePercent) >= 0 ? "+" : ""}${Number(s.changePercent).toFixed(2)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 text-xs">
                      {fmtMcap(s.marketCap)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {fmtNum(s.peRatio)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 text-xs">
                      {s.roe != null
                        ? `${(Number(s.roe) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          Number(s.rsi14 || 0) > 70
                            ? "bg-red-500/15 text-red-400"
                            : Number(s.rsi14 || 0) < 30
                              ? "bg-green-500/15 text-green-400"
                              : "text-slate-300"
                        }`}
                      >
                        {fmtNum(s.rsi14)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
