import { useNavigate } from "react-router-dom";
import useScreenerStore from "../store/useScreenerStore";
import useScreener from "../hooks/useScreener";

// ── Number formatters ──────────────────────────────────────
const fmtCurrency = (v) => {
  if (v == null) return "—";
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${Number(v).toLocaleString()}`;
};
const fmtNum = (v, d = 2) => (v == null ? "—" : Number(v).toFixed(d));
const fmtPct = (v) => (v == null ? "—" : `${Number(v).toFixed(2)}%`);
const fmtVol = (v) => {
  if (v == null) return "—";
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString();
};

const COLUMNS = [
  {
    key: "ticker",
    label: "Ticker",
    fmt: (v) => v,
    align: "left",
    sortable: true,
  },
  {
    key: "companyName",
    label: "Company",
    fmt: (v) => v,
    align: "left",
    sortable: false,
    wide: true,
  },
  {
    key: "sector",
    label: "Sector",
    fmt: (v) => v || "—",
    align: "left",
    sortable: true,
  },
  {
    key: "price",
    label: "Price",
    fmt: (v) => `$${fmtNum(v)}`,
    align: "right",
    sortable: true,
  },
  {
    key: "changePercent",
    label: "Chg %",
    fmt: fmtPct,
    align: "right",
    sortable: true,
    color: true,
  },
  {
    key: "marketCap",
    label: "Mkt Cap",
    fmt: fmtCurrency,
    align: "right",
    sortable: true,
  },
  { key: "peRatio", label: "P/E", fmt: fmtNum, align: "right", sortable: true },
  { key: "eps", label: "EPS", fmt: fmtNum, align: "right", sortable: true },
  {
    key: "dividendYield",
    label: "Div %",
    fmt: fmtPct,
    align: "right",
    sortable: true,
  },
  {
    key: "volume",
    label: "Volume",
    fmt: fmtVol,
    align: "right",
    sortable: true,
  },
  { key: "rsi14", label: "RSI", fmt: fmtNum, align: "right", sortable: true },
  {
    key: "sma50",
    label: "SMA 50",
    fmt: fmtNum,
    align: "right",
    sortable: true,
  },
];

export default function ResultsTable() {
  const navigate = useNavigate();
  const { results, sort, setSort, page, setPage, loading, error } =
    useScreenerStore();
  const { runScreen } = useScreener();

  const handleSort = (field) => {
    const newDir =
      sort.field === field && sort.direction === "desc" ? "asc" : "desc";
    setSort({ field, direction: newDir });
    setTimeout(runScreen, 0);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    setTimeout(runScreen, 0);
  };

  // ── Empty / Error / Loading states ──────────────────────
  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  if (!results && !loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
        <p className="text-slate-400 text-lg">
          Add filters and click "Screen Stocks" to see results
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 mt-4">Screening...</p>
      </div>
    );
  }

  if (results.data.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
        <p className="text-slate-400 text-lg">No stocks match your filters</p>
        <p className="text-slate-500 text-sm mt-2">
          Try adjusting your criteria
        </p>
      </div>
    );
  }

  // ── Table ───────────────────────────────────────────────
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {/* Summary bar */}
      <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
        <span className="text-sm text-slate-400">
          {results.totalElements.toLocaleString()} results
        </span>
        <span className="text-sm text-slate-500">
          Page {results.page + 1} of {results.totalPages}
        </span>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium text-slate-400 whitespace-nowrap
                    ${col.align === "right" ? "text-right" : "text-left"}
                    ${col.sortable ? "cursor-pointer hover:text-white select-none" : ""}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  {col.label}
                  {col.sortable && sort.field === col.key && (
                    <span className="ml-1 text-blue-400">
                      {sort.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.data.map((row) => (
              <tr
                key={row.ticker}
                onClick={() => navigate(`/stock/${row.ticker}`)}
                className="border-b border-slate-700/50 hover:bg-slate-700/40 
                           cursor-pointer transition-colors"
              >
                {COLUMNS.map((col) => {
                  const val = row[col.key];
                  const formatted = col.fmt(val);
                  let colorClass = "";
                  if (col.color && val != null) {
                    colorClass = val >= 0 ? "text-green-400" : "text-red-400";
                  }
                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-3 whitespace-nowrap 
                        ${col.align === "right" ? "text-right" : "text-left"}
                        ${col.key === "ticker" ? "font-semibold text-blue-400" : "text-slate-300"}
                        ${col.wide ? "max-w-[200px] truncate" : ""}
                        ${colorClass}`}
                    >
                      {formatted}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {results.totalPages > 1 && (
        <div className="px-5 py-3 border-t border-slate-700 flex items-center justify-center gap-2">
          <button
            disabled={page === 0}
            onClick={() => handlePageChange(page - 1)}
            className="px-3 py-1.5 text-sm rounded bg-slate-700 text-slate-300 
                       hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            ← Prev
          </button>
          {Array.from({ length: Math.min(results.totalPages, 5) }, (_, i) => {
            const pageNum =
              Math.max(0, Math.min(page - 2, results.totalPages - 5)) + i;
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`px-3 py-1.5 text-sm rounded cursor-pointer ${
                  pageNum === page
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {pageNum + 1}
              </button>
            );
          })}
          <button
            disabled={page >= results.totalPages - 1}
            onClick={() => handlePageChange(page + 1)}
            className="px-3 py-1.5 text-sm rounded bg-slate-700 text-slate-300 
                       hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
