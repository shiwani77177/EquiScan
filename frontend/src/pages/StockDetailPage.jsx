import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { getStockDetail, getStockPrices } from "../services/api";

const fmtCurrency = (v) => {
  if (v == null) return "—";
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${Number(v).toFixed(2)}`;
};

const StatCard = ({ label, value }) => (
  <div className="bg-slate-700/50 rounded-lg p-3">
    <p className="text-xs text-slate-400 mb-1">{label}</p>
    <p className="text-sm font-semibold text-white">{value}</p>
  </div>
);

export default function StockDetailPage() {
  const { ticker } = useParams();
  const [stock, setStock] = useState(null);
  const [prices, setPrices] = useState([]);
  const [months, setMonths] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([getStockDetail(ticker), getStockPrices(ticker, months)])
      .then(([detail, priceData]) => {
        setStock(detail);
        setPrices(priceData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [ticker, months]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 text-center">
        <p className="text-red-400">{error || "Stock not found"}</p>
        <Link
          to="/"
          className="text-blue-400 hover:underline mt-4 inline-block"
        >
          ← Back to screener
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      {/* Back link */}
      <Link to="/" className="text-sm text-slate-400 hover:text-white">
        ← Back to screener
      </Link>

      {/* Company header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{stock.ticker}</h2>
            <p className="text-slate-400 mt-1">{stock.companyName}</p>
            <p className="text-sm text-slate-500 mt-1">
              {stock.sector} · {stock.industry} · {stock.exchange}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">
              ${Number(stock.price).toFixed(2)}
            </p>
            <p
              className={`text-lg font-semibold mt-1 ${
                stock.changePercent >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {stock.changePercent >= 0 ? "+" : ""}
              {Number(stock.changePercent).toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Fundamentals grid */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Fundamentals</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Market Cap" value={fmtCurrency(stock.marketCap)} />
          <StatCard
            label="P/E Ratio"
            value={
              stock.peRatio != null ? Number(stock.peRatio).toFixed(2) : "—"
            }
          />
          <StatCard
            label="EPS"
            value={stock.eps != null ? `$${Number(stock.eps).toFixed(2)}` : "—"}
          />
          <StatCard
            label="Dividend Yield"
            value={
              stock.dividendYield != null
                ? `${Number(stock.dividendYield).toFixed(2)}%`
                : "—"
            }
          />
          <StatCard
            label="Debt/Equity"
            value={
              stock.debtToEquity != null
                ? Number(stock.debtToEquity).toFixed(2)
                : "—"
            }
          />
          <StatCard
            label="ROE"
            value={stock.roe != null ? `${Number(stock.roe).toFixed(2)}%` : "—"}
          />
          <StatCard
            label="P/B Ratio"
            value={
              stock.priceToBook != null
                ? Number(stock.priceToBook).toFixed(2)
                : "—"
            }
          />
          <StatCard
            label="Volume"
            value={stock.volume?.toLocaleString() ?? "—"}
          />
        </div>
      </div>

      {/* Technicals */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Technical Indicators
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="SMA 50"
            value={stock.sma50 != null ? Number(stock.sma50).toFixed(2) : "—"}
          />
          <StatCard
            label="SMA 200"
            value={stock.sma200 != null ? Number(stock.sma200).toFixed(2) : "—"}
          />
          <StatCard
            label="RSI 14"
            value={stock.rsi14 != null ? Number(stock.rsi14).toFixed(2) : "—"}
          />
          <StatCard
            label="MACD"
            value={stock.macd != null ? Number(stock.macd).toFixed(4) : "—"}
          />
        </div>
      </div>

      {/* Price chart */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Price History</h3>
          <div className="flex gap-2">
            {[1, 3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`px-3 py-1 text-xs rounded-full cursor-pointer ${
                  months === m
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                }`}
              >
                {m}M
              </button>
            ))}
          </div>
        </div>

        {prices.length > 0 ? (
          <div className="space-y-4">
            {/* Price line chart */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={prices}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: "#94a3b8" }}
                  formatter={(v) => [`$${Number(v).toFixed(2)}`, "Close"]}
                />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="#3b82f6"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="sma50"
                  stroke="#f59e0b"
                  dot={false}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="sma200"
                  stroke="#ef4444"
                  dot={false}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Volume bar chart */}
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={prices}>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: 8,
                  }}
                  formatter={(v) => [Number(v).toLocaleString(), "Volume"]}
                />
                <Bar dataKey="volume" fill="#475569" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-12">
            No price data available
          </p>
        )}
      </div>
    </div>
  );
}
