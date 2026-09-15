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

const fmtCurrency = (v) => {
  if (v == null) return "—";
  const n = Number(v);
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  return `$${n.toLocaleString()}`;
};

export default function SectorsPage() {
  const navigate = useNavigate();
  const [allStocks, setAllStocks] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [selectedSector, setSelectedSector] = useState(null);
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
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sectorData = sectors.map((sector) => {
    const stocks = allStocks.filter((s) => s.sector === sector);
    const totalMcap = stocks.reduce(
      (sum, s) => sum + Number(s.marketCap || 0),
      0,
    );
    const avgPE = stocks
      .filter((s) => s.peRatio)
      .reduce((sum, s, _, a) => sum + Number(s.peRatio) / a.length, 0);
    const avgRSI = stocks
      .filter((s) => s.rsi14)
      .reduce((sum, s, _, a) => sum + Number(s.rsi14) / a.length, 0);
    return {
      name: sector,
      count: stocks.length,
      totalMcap,
      avgPE,
      avgRSI,
      stocks,
    };
  });

  const filteredStocks = selectedSector
    ? allStocks.filter((s) => s.sector === selectedSector)
    : allStocks;

  const chartData = sectorData.map((s) => ({ name: s.name, stocks: s.count }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      <h2 className="text-2xl font-bold text-white">Sectors</h2>
      <p className="text-slate-400 text-sm">Breakdown by industry sector</p>

      {/* Sector count chart */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Stocks per Sector
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis
              dataKey="name"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
            />
            <Tooltip
              contentStyle={{
                background: "#1e293b",
                border: "1px solid #475569",
                borderRadius: 8,
              }}
            />
            <Bar dataKey="stocks" radius={[4, 4, 0, 0]} fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sector cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectorData.map((s) => (
          <div
            key={s.name}
            onClick={() =>
              setSelectedSector(selectedSector === s.name ? null : s.name)
            }
            className={`bg-slate-800 border rounded-xl p-5 cursor-pointer transition-all
              ${selectedSector === s.name ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-700 hover:border-slate-500"}`}
          >
            <h4 className="text-white font-semibold">{s.name}</h4>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <p className="text-xs text-slate-400">Stocks</p>
                <p className="text-lg font-bold text-white">{s.count}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Market Cap</p>
                <p className="text-lg font-bold text-white">
                  {fmtCurrency(s.totalMcap)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Avg P/E</p>
                <p className="text-sm font-semibold text-slate-300">
                  {s.avgPE.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Avg RSI</p>
                <p className="text-sm font-semibold text-slate-300">
                  {s.avgRSI.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtered stocks table */}
      {selectedSector && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {selectedSector} Stocks
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400">Ticker</th>
                  <th className="text-left px-4 py-3 text-slate-400">
                    Company
                  </th>
                  <th className="text-right px-4 py-3 text-slate-400">Price</th>
                  <th className="text-right px-4 py-3 text-slate-400">
                    Market Cap
                  </th>
                  <th className="text-right px-4 py-3 text-slate-400">P/E</th>
                  <th className="text-right px-4 py-3 text-slate-400">RSI</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((s) => (
                  <tr
                    key={s.ticker}
                    onClick={() => navigate(`/stock/${s.ticker}`)}
                    className="border-b border-slate-700/50 hover:bg-slate-700/40 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-blue-400 font-semibold">
                      {s.ticker}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {s.companyName || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {s.price != null ? `$${Number(s.price).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {fmtCurrency(s.marketCap)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {s.peRatio != null ? Number(s.peRatio).toFixed(2) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {s.rsi14 != null ? Number(s.rsi14).toFixed(1) : "—"}
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
