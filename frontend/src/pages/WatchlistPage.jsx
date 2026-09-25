import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { screenStocks } from "../services/api";

const cleanTicker = (t) => (t ? t.replace(".NS", "").replace(".BO", "") : "—");
const fmtPrice = (v) =>
  v == null
    ? "—"
    : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const fmtPct = (v) => {
  if (v == null) return "—";
  const n = Number(v);
  return `${n >= 0 ? "▲" : "▼"} ${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};
const fmtNum = (v) => (v == null ? "—" : Number(v).toFixed(1));
const fmtDate = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function WatchlistPage() {
  const navigate = useNavigate();
  const [allStocks, setAllStocks] = useState([]);
  const [watchlistTickers, setWatchlistTickers] = useState([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef(null);

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("equiscan-watchlist");
    if (saved) {
      try {
        setWatchlistTickers(JSON.parse(saved));
      } catch (e) {
        /* ignore */
      }
    }
  }, []);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      "equiscan-watchlist",
      JSON.stringify(watchlistTickers),
    );
  }, [watchlistTickers]);

  // Load all stocks for search
  useEffect(() => {
    screenStocks([], { field: "market_cap", direction: "desc" }, 0, 200)
      .then((result) => setAllStocks(result.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Search results (exclude already added)
  const searchResults = search.trim()
    ? allStocks
        .filter((s) => {
          const q = search.toLowerCase();
          return (
            ((s.companyName || "").toLowerCase().includes(q) ||
              cleanTicker(s.ticker).toLowerCase().includes(q)) &&
            !watchlistTickers.some((w) => w.ticker === s.ticker)
          );
        })
        .slice(0, 6)
    : [];

  // Get full stock data for watchlist tickers
  const watchlistStocks = watchlistTickers
    .map((w) => {
      const stock = allStocks.find((s) => s.ticker === w.ticker);
      return stock ? { ...stock, addedAt: w.addedAt } : null;
    })
    .filter(Boolean);

  // Add to watchlist
  const addStock = (stock) => {
    setWatchlistTickers((prev) => [
      { ticker: stock.ticker, addedAt: new Date().toISOString() },
      ...prev,
    ]);
    setSearch("");
    setShowDropdown(false);
  };

  // Remove from watchlist
  const removeStock = (ticker) => {
    setWatchlistTickers((prev) => prev.filter((w) => w.ticker !== ticker));
  };

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
          Watchlist
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Track stocks and set price / metric alerts.
        </p>
      </div>

      {/* ═══ Add to Watchlist ══════════════════════════ */}
      <div className="bg-[#111827] border border-slate-700/40 rounded-xl p-6">
        <h3 className="text-[15px] font-bold text-white mb-4">
          Add to watchlist
        </h3>

        <div className="relative max-w-lg" ref={searchRef}>
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
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
            placeholder="Search company or ticker..."
            className="w-full bg-slate-800 border border-slate-600/50 rounded-lg pl-10 pr-4 py-3
                       text-sm text-slate-200 placeholder-slate-500
                       focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
          />

          {/* Dropdown results */}
          {showDropdown && searchResults.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg 
                            shadow-xl z-50 overflow-hidden max-w-lg"
            >
              {searchResults.map((s) => (
                <button
                  key={s.ticker}
                  onClick={() => addStock(s)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800 
                             transition-colors cursor-pointer border-b border-slate-700/30 last:border-0 text-left"
                >
                  <div>
                    <p className="text-sm text-white font-medium">
                      {s.companyName || cleanTicker(s.ticker)}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      {cleanTicker(s.ticker)} · {s.sector}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-300">
                      {fmtPrice(s.price)}
                    </p>
                    <p
                      className={`text-xs font-medium ${Number(s.changePercent || 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {fmtPct(s.changePercent)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {showDropdown && search.trim() && searchResults.length === 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg 
                            shadow-xl z-50 px-4 py-3"
            >
              <p className="text-sm text-slate-500">
                No stocks found matching "{search}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Your Watchlist ════════════════════════════ */}
      <div className="bg-[#111827] border border-slate-700/40 rounded-xl p-6">
        <h3 className="text-[15px] font-bold text-white mb-4">
          Your watchlist
        </h3>

        {watchlistStocks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    Company
                  </th>
                  <th className="text-right px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    Price
                  </th>
                  <th className="text-right px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    Change%
                  </th>
                  <th className="text-right px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    P/E
                  </th>
                  <th className="text-right px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    RSI
                  </th>
                  <th className="text-right px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    Market Cap
                  </th>
                  <th className="text-center px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    Added
                  </th>
                  <th className="text-center px-4 py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {watchlistStocks.map((s) => (
                  <tr
                    key={s.ticker}
                    className="border-b border-slate-700/25 hover:bg-slate-700/20 transition-colors group"
                  >
                    {/* Company + Ticker */}
                    <td
                      className="px-4 py-3.5 cursor-pointer"
                      onClick={() => navigate(`/stock/${s.ticker}`)}
                    >
                      <p className="text-white font-medium group-hover:text-green-400 transition-colors">
                        {s.companyName || cleanTicker(s.ticker)}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {cleanTicker(s.ticker)}
                      </p>
                    </td>

                    {/* Price */}
                    <td
                      className="px-4 py-3.5 text-right text-slate-200 font-medium cursor-pointer"
                      onClick={() => navigate(`/stock/${s.ticker}`)}
                    >
                      {fmtPrice(s.price)}
                    </td>

                    {/* Change% */}
                    <td
                      className={`px-4 py-3.5 text-right font-semibold text-xs cursor-pointer
                      ${Number(s.changePercent || 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                      onClick={() => navigate(`/stock/${s.ticker}`)}
                    >
                      {fmtPct(s.changePercent)}
                    </td>

                    {/* P/E */}
                    <td
                      className="px-4 py-3.5 text-right text-slate-300 cursor-pointer"
                      onClick={() => navigate(`/stock/${s.ticker}`)}
                    >
                      {fmtNum(s.peRatio)}
                    </td>

                    {/* RSI */}
                    <td
                      className="px-4 py-3.5 text-right cursor-pointer"
                      onClick={() => navigate(`/stock/${s.ticker}`)}
                    >
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

                    {/* Market Cap */}
                    <td
                      className="px-4 py-3.5 text-right text-slate-300 text-xs cursor-pointer"
                      onClick={() => navigate(`/stock/${s.ticker}`)}
                    >
                      {s.marketCap
                        ? `₹${(Number(s.marketCap) / 1e9).toFixed(0)} Cr`
                        : "—"}
                    </td>

                    {/* Added Date */}
                    <td className="px-4 py-3.5 text-center text-slate-400 text-xs">
                      {fmtDate(s.addedAt)}
                    </td>

                    {/* Remove Button */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStock(s.ticker);
                        }}
                        className="text-xs text-red-400 border border-red-400/30 px-3 py-1.5 rounded-md 
                                   hover:bg-red-400/10 transition-colors cursor-pointer font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <span className="text-4xl">⭐</span>
            <p className="text-slate-400 mt-3 text-sm">
              No stocks in your watchlist yet
            </p>
            <p className="text-slate-500 mt-1 text-xs">
              Search above to add stocks you want to track
            </p>
          </div>
        )}
      </div>

      {/* ═══ Quick Stats (if watchlist has stocks) ════ */}
      {watchlistStocks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#111827] border border-slate-700/40 rounded-xl p-4">
            <p className="text-xs text-slate-500">Stocks Tracked</p>
            <p className="text-xl font-bold text-white mt-1">
              {watchlistStocks.length}
            </p>
          </div>
          <div className="bg-[#111827] border border-slate-700/40 rounded-xl p-4">
            <p className="text-xs text-slate-500">Avg Change%</p>
            <p
              className={`text-xl font-bold mt-1 ${
                watchlistStocks.reduce(
                  (sum, s) => sum + Number(s.changePercent || 0),
                  0,
                ) /
                  watchlistStocks.length >=
                0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {(
                watchlistStocks.reduce(
                  (sum, s) => sum + Number(s.changePercent || 0),
                  0,
                ) / watchlistStocks.length
              ).toFixed(2)}
              %
            </p>
          </div>
          <div className="bg-[#111827] border border-slate-700/40 rounded-xl p-4">
            <p className="text-xs text-slate-500">Avg P/E</p>
            <p className="text-xl font-bold text-white mt-1">
              {watchlistStocks
                .filter((s) => s.peRatio)
                .reduce((sum, s, _, a) => sum + Number(s.peRatio) / a.length, 0)
                .toFixed(1)}
            </p>
          </div>
          <div className="bg-[#111827] border border-slate-700/40 rounded-xl p-4">
            <p className="text-xs text-slate-500">Gainers / Losers</p>
            <p className="text-xl font-bold mt-1">
              <span className="text-green-400">
                {
                  watchlistStocks.filter(
                    (s) => Number(s.changePercent || 0) >= 0,
                  ).length
                }
              </span>
              <span className="text-slate-600 mx-1">/</span>
              <span className="text-red-400">
                {
                  watchlistStocks.filter(
                    (s) => Number(s.changePercent || 0) < 0,
                  ).length
                }
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
