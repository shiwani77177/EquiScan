import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { screenStocks } from "../services/api";

const fmtCurrency = (v) => {
  if (v == null) return "—";
  const n = Number(v);
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
};
const fmtNum = (v, d = 2) => (v == null ? "—" : Number(v).toFixed(d));

export default function StocksPage() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    screenStocks([], { field: "market_cap", direction: "desc" }, 0, 100)
      .then((result) => setStocks(result.data || []))
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <h2 className="text-2xl font-bold text-white mb-1">All Stocks</h2>
      <p className="text-slate-400 text-sm mb-6">
        {stocks.length} stocks tracked
      </p>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">
                  Ticker
                </th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">
                  Company
                </th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">
                  Sector
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
                  EPS
                </th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">
                  RSI
                </th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">
                  SMA 50
                </th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">
                  SMA 200
                </th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((s) => (
                <tr
                  key={s.ticker}
                  onClick={() => navigate(`/stock/${s.ticker}`)}
                  className="border-b border-slate-700/50 hover:bg-slate-700/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-blue-400 font-semibold">
                    {s.ticker}
                  </td>
                  <td className="px-4 py-3 text-white max-w-[200px] truncate">
                    {s.companyName || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {s.sector || "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {s.price != null ? `$${fmtNum(s.price)}` : "—"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${Number(s.changePercent || 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {s.changePercent != null
                      ? `${Number(s.changePercent).toFixed(2)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {fmtCurrency(s.marketCap)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {fmtNum(s.peRatio)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {fmtNum(s.eps)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {fmtNum(s.rsi14)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {fmtNum(s.sma50)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {fmtNum(s.sma200)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
