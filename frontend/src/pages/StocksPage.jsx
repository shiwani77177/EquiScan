import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { screenStocks } from "../services/api";

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
const fmtPct = (v) => {
  if (v == null) return "—";
  const n = Number(v);
  return `${n >= 0 ? "▲" : "▼"} ${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};
const fmtNum = (v) => (v == null ? "—" : Number(v).toFixed(1));

const PAGE_SIZE = 10;

export default function StocksPage() {
  const navigate = useNavigate();
  const [allStocks, setAllStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("market_cap");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    screenStocks([], { field: "market_cap", direction: "desc" }, 0, 200)
      .then((result) => setAllStocks(result.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Search filter
  const filtered = allStocks.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.companyName || "").toLowerCase().includes(q) ||
      cleanTicker(s.ticker).toLowerCase().includes(q) ||
      (s.sector || "").toLowerCase().includes(q)
    );
  });

  // Client-side sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortField] ?? 0;
    let bVal = b[sortField] ?? 0;
    if (typeof aVal === "string")
      return sortDir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    return sortDir === "asc"
      ? Number(aVal) - Number(bVal)
      : Number(bVal) - Number(aVal);
  });

  // Pagination
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // Reset page on search
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field)
      return <span className="text-slate-600 ml-0.5 text-[10px]">↕</span>;
    return (
      <span className="text-green-400 ml-0.5 text-[10px]">
        {sortDir === "desc" ? "↓" : "↑"}
      </span>
    );
  };

  const TH = ({ field, children, right }) => (
    <th
      onClick={() => handleSort(field)}
      className={`px-4 py-3 text-${right ? "right" : "left"} text-slate-400 text-[11px] uppercase tracking-wider 
                  font-semibold cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap`}
    >
      {children}
      <SortIcon field={field} />
    </th>
  );

  if (loading)
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          All Stocks
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Search and sort the full universe of NSE/BSE stocks.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-[#111827] border border-slate-700/40 rounded-xl p-6">
        {/* Search Bar */}
        <div className="mb-5">
          <div className="relative max-w-md">
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ticker..."
              className="w-full bg-slate-800 border border-slate-600/50 rounded-lg pl-10 pr-4 py-3
                         text-sm text-slate-200 placeholder-slate-500
                         focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {filtered.length} of {allStocks.length} stocks
            {search && ` matching "${search}"`}
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <TH field="companyName">Company</TH>
                <TH field="ticker">Ticker</TH>
                <TH field="price" right>
                  Price
                </TH>
                <TH field="changePercent" right>
                  Change%
                </TH>
                <TH field="marketCap" right>
                  Market Cap
                </TH>
                <TH field="sector">Sector</TH>
                <TH field="peRatio" right>
                  P/E
                </TH>
                <TH field="eps" right>
                  EPS
                </TH>
                <TH field="rsi14" right>
                  RSI
                </TH>
              </tr>
            </thead>
            <tbody>
              {paginated.map((s) => (
                <tr
                  key={s.ticker}
                  onClick={() => navigate(`/stock/${s.ticker}`)}
                  className="border-b border-slate-700/25 hover:bg-slate-700/20 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3.5">
                    <p className="text-white font-medium group-hover:text-green-400 transition-colors">
                      {s.companyName || cleanTicker(s.ticker)}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">
                    {cleanTicker(s.ticker)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-200 font-medium">
                    {fmtPrice(s.price)}
                  </td>
                  <td
                    className={`px-4 py-3.5 text-right font-semibold text-xs
                    ${Number(s.changePercent || 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {fmtPct(s.changePercent)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-300 text-xs">
                    {fmtMcap(s.marketCap)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                      {s.sector
                        ? s.sector.charAt(0) +
                          s.sector.slice(1).toLowerCase().replace(/_/g, " ")
                        : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-300">
                    {fmtNum(s.peRatio)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-300">
                    {fmtNum(s.eps)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
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

        {/* Empty state */}
        {paginated.length === 0 && (
          <div className="text-center py-12">
            <span className="text-3xl">🔍</span>
            <p className="text-slate-400 mt-3">
              No stocks found matching "{search}"
            </p>
            <button
              onClick={() => setSearch("")}
              className="mt-2 text-sm text-blue-400 hover:text-blue-300 cursor-pointer"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-700/30">
            <p className="text-xs text-slate-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, sorted.length)} of{" "}
              {sorted.length} stocks
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-400 hover:text-white 
                           disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border border-slate-700"
              >
                ««
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 text-xs rounded bg-slate-800 text-slate-400 hover:text-white 
                           disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border border-slate-700"
              >
                ‹ Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - currentPage) <= 1,
                )
                .map((page, i, arr) => {
                  const ellipsis = i > 0 && page - arr[i - 1] > 1;
                  return (
                    <span key={page}>
                      {ellipsis && (
                        <span className="text-slate-600 px-1">…</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 text-xs rounded cursor-pointer border
                          ${
                            currentPage === page
                              ? "bg-green-500/20 text-green-400 border-green-500/40 font-bold"
                              : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500"
                          }`}
                      >
                        {page}
                      </button>
                    </span>
                  );
                })}

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 text-xs rounded bg-slate-800 text-slate-400 hover:text-white 
                           disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border border-slate-700"
              >
                Next ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-400 hover:text-white 
                           disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border border-slate-700"
              >
                »»
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
