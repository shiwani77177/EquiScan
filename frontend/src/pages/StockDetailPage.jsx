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
  const num = Number(v);
  if (Math.abs(num) >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (Math.abs(num) >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (Math.abs(num) >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toLocaleString()}`;
};

const fmtNum = (v, d = 2) => (v == null ? "—" : Number(v).toFixed(d));

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

    // Fetch stock detail and price history in parallel
    Promise.all([getStockDetail(ticker), getStockPrices(ticker, months)])
      .then(([detail, priceData]) => {
        setStock(detail);
        // Convert price data: ensure numbers are actual numbers
        // The API might return BigDecimal strings from PostgreSQL
        const formattedPrices = (priceData || []).map((p) => ({
          date: p.date,
          open: p.open ? Number(p.open) : null,
          high: p.high ? Number(p.high) : null,
          low: p.low ? Number(p.low) : null,
          close: p.close ? Number(p.close) : null,
          volume: p.volume ? Number(p.volume) : null,
          sma50: p.sma_50 ? Number(p.sma_50) : null,
          sma200: p.sma_200 ? Number(p.sma_200) : null,
        }));
        setPrices(formattedPrices);
      })
      .catch((err) => {
        console.error("Error fetching stock detail:", err);
        setError(
          err.response?.data?.error ||
            err.message ||
            "Failed to load stock data",
        );
      })
      .finally(() => setLoading(false));
  }, [ticker, months]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 mt-4">Loading {ticker}...</p>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 text-center">
        <p className="text-red-400 text-lg">{error || "Stock not found"}</p>
        <Link
          to="/"
          className="text-blue-400 hover:underline mt-4 inline-block"
        >
          ← Back to screener
        </Link>
      </div>
    );
  }

  // Safely get values — handle both camelCase and snake_case field names
  // The API might return either depending on how Jackson serializes
  const price = stock.price ?? stock.close;
  const changePercent = stock.changePercent ?? stock.change_percent;
  const companyName = stock.companyName ?? stock.company_name;
  const marketCap = stock.marketCap ?? stock.market_cap;
  const peRatio = stock.peRatio ?? stock.pe_ratio;
  const eps = stock.eps;
  const dividendYield = stock.dividendYield ?? stock.dividend_yield;
  const debtToEquity = stock.debtToEquity ?? stock.debt_to_equity;
  const roe = stock.roe;
  const priceToBook = stock.priceToBook ?? stock.price_to_book;
  const sma50 = stock.sma50 ?? stock.sma_50;
  const sma200 = stock.sma200 ?? stock.sma_200;
  const rsi14 = stock.rsi14 ?? stock.rsi_14;
  const macd = stock.macd;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      {/* Back link */}
      <Link to="/" className="text-sm text-slate-400 hover:text-white">
        ← Back to screener
      </Link>

      {/* Company header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{stock.ticker}</h2>
            <p className="text-slate-400 mt-1">{companyName}</p>
            <p className="text-sm text-slate-500 mt-1">
              {stock.sector} · {stock.industry} · {stock.exchange}
            </p>
          </div>
          <div className="text-right">
            {price != null ? (
              <>
                <p className="text-3xl font-bold text-white">
                  ${Number(price).toFixed(2)}
                </p>
                {changePercent != null && (
                  <p
                    className={`text-lg font-semibold mt-1 ${
                      Number(changePercent) >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {Number(changePercent) >= 0 ? "+" : ""}
                    {Number(changePercent).toFixed(2)}%
                  </p>
                )}
              </>
            ) : (
              <p className="text-2xl text-slate-500">Price unavailable</p>
            )}
          </div>
        </div>
      </div>

      {/* Fundamentals grid */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Fundamentals</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Market Cap" value={fmtCurrency(marketCap)} />
          <StatCard label="P/E Ratio" value={fmtNum(peRatio)} />
          <StatCard label="EPS" value={eps != null ? `$${fmtNum(eps)}` : "—"} />
          <StatCard
            label="Dividend Yield"
            value={
              dividendYield != null
                ? `${(Number(dividendYield) * 100).toFixed(2)}%`
                : "—"
            }
          />
          <StatCard label="Debt/Equity" value={fmtNum(debtToEquity)} />
          <StatCard
            label="ROE"
            value={roe != null ? `${(Number(roe) * 100).toFixed(1)}%` : "—"}
          />
          <StatCard label="P/B Ratio" value={fmtNum(priceToBook)} />
          <StatCard
            label="Volume"
            value={stock.volume ? Number(stock.volume).toLocaleString() : "—"}
          />
        </div>
      </div>

      {/* Technicals */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Technical Indicators
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="SMA 50" value={fmtNum(sma50)} />
          <StatCard label="SMA 200" value={fmtNum(sma200)} />
          <StatCard label="RSI 14" value={fmtNum(rsi14)} />
          <StatCard label="MACD" value={fmtNum(macd, 4)} />
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
                  tickFormatter={(d) => {
                    const date = new Date(d);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
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
                  formatter={(v, name) => {
                    if (v == null) return ["-", name];
                    return [`$${Number(v).toFixed(2)}`, name];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="#3b82f6"
                  dot={false}
                  strokeWidth={2}
                  name="Close"
                />
                <Line
                  type="monotone"
                  dataKey="sma50"
                  stroke="#f59e0b"
                  dot={false}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  name="SMA 50"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="sma200"
                  stroke="#ef4444"
                  dot={false}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  name="SMA 200"
                  connectNulls
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
            No price data available for this period
          </p>
        )}
      </div>
    </div>
  );
}
