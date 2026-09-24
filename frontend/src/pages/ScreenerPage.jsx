import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { screenStocks, getSectors } from "../services/api";

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
const fmtPct = (v) =>
  v == null ? "—" : `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(1)}%`;
const fmtNum = (v) => (v == null ? "—" : Number(v).toFixed(1));

const PRESETS = [
  {
    name: "Quality Growth at Reasonable Price",
    filters: [
      { field: "pe_ratio", operator: "lt", value: 40 },
      { field: "roe", operator: "gt", value: 0.12 },
      { field: "eps", operator: "gt", value: 10 },
    ],
  },
  {
    name: "Deep Value",
    filters: [
      { field: "pe_ratio", operator: "lt", value: 15 },
      { field: "dividend_yield", operator: "gt", value: 0.02 },
      { field: "price_to_book", operator: "lt", value: 3 },
    ],
  },
  {
    name: "Momentum Breakout",
    filters: [
      { field: "rsi_14", operator: "gt", value: 55 },
      { field: "change_percent", operator: "gt", value: 0 },
    ],
  },
];

const OPERATORS = [
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "eq", label: "=" },
];

const FILTER_FIELDS = [
  { value: "pe_ratio", label: "P/E Ratio" },
  { value: "eps", label: "EPS" },
  { value: "roe", label: "ROE" },
  { value: "dividend_yield", label: "Div Yield" },
  { value: "debt_to_equity", label: "Debt/Equity" },
  { value: "price_to_book", label: "Price/Book" },
  { value: "market_cap", label: "Market Cap" },
  { value: "rsi_14", label: "RSI (14)" },
  { value: "sma_50", label: "SMA 50" },
  { value: "sma_200", label: "SMA 200" },
  { value: "change_percent", label: "Change %" },
  { value: "price", label: "Price" },
  { value: "volume", label: "Volume" },
  { value: "revenue", label: "Revenue" },
  { value: "net_income", label: "Net Income" },
  { value: "free_cash_flow", label: "FCF" },
];

const PAGE_SIZE = 10;

export default function ScreenerPage() {
  const navigate = useNavigate();
  const [allStocks, setAllStocks] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState([]);
  const [selectedSectors, setSelectedSectors] = useState([]);

  const [sortField, setSortField] = useState("market_cap");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    getSectors().then(setSectors).catch(console.error);
    runScreen([], []);
  }, []);

  const runScreen = useCallback(
    async (activeFilters) => {
      setLoading(true);
      setError(null);
      setCurrentPage(1);
      try {
        const result = await screenStocks(
          activeFilters,
          { field: sortField, direction: sortDir },
          0,
          200,
        );
        setAllStocks(result.data || []);
      } catch (err) {
        setError(err.message || "Failed to screen stocks");
      } finally {
        setLoading(false);
      }
    },
    [sortField, sortDir],
  );

  // Filter stocks by selected sectors (client-side OR logic)
  const filteredStocks =
    selectedSectors.length > 0
      ? allStocks.filter((s) => selectedSectors.includes(s.sector))
      : allStocks;

  // Pagination
  const totalPages = Math.ceil(filteredStocks.length / PAGE_SIZE);
  const paginatedStocks = filteredStocks.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handlePreset = (preset) => {
    setActivePreset(preset.name);
    setFilters(preset.filters);
    setSelectedSectors([]);
    runScreen(preset.filters);
  };

  const handleReset = () => {
    setActivePreset(null);
    setFilters([]);
    setSelectedSectors([]);
    runScreen([]);
  };

  const toggleSector = (sector) => {
    const newSectors = selectedSectors.includes(sector)
      ? selectedSectors.filter((s) => s !== sector)
      : [...selectedSectors, sector];
    setSelectedSectors(newSectors);
    setCurrentPage(1);
  };

  const addFilter = () => {
    setFilters([...filters, { field: "", operator: "gt", value: "" }]);
  };

  const updateFilter = (index, key, value) => {
    const newFilters = [...filters];
    newFilters[index] = {
      ...newFilters[index],
      [key]: key === "value" ? Number(value) || value : value,
    };
    setFilters(newFilters);
  };

  const removeFilter = (index) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
    const valid = newFilters.filter(
      (f) => f.field && f.value !== "" && f.value !== undefined,
    );
    runScreen(valid);
  };

  const applyFilters = () => {
    const valid = filters.filter(
      (f) => f.field && f.value !== "" && f.value !== undefined,
    );
    runScreen(valid);
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  useEffect(() => {
    const valid = filters.filter(
      (f) => f.field && f.value !== "" && f.value !== undefined,
    );
    runScreen(valid);
  }, [sortField, sortDir]);

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
      className={`px-3 py-3 text-${right ? "right" : "left"} text-slate-400 text-[11px] uppercase tracking-wider 
                  font-semibold cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap`}
    >
      {children}
      <SortIcon field={field} />
    </th>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Stock Screener
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Filter the universe by fundamentals, valuation, technicals and
          ownership.
        </p>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => handlePreset(p)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all cursor-pointer
              ${
                activePreset === p.name
                  ? "bg-green-500/20 text-green-400 border-green-500/40"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white"
              }`}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium rounded-lg border bg-slate-800 text-slate-400 
                     border-slate-700 hover:border-red-500/40 hover:text-red-400 transition-all cursor-pointer"
        >
          Reset Filters
        </button>
      </div>

      {/* ═══ Main Layout ═══════════════════════════════ */}
      <div className="flex gap-5 items-start">
        {/* ── Sidebar ──────────────────────────────────── */}
        {!filtersCollapsed && (
          <div className="bg-[#111827] border border-slate-700/40 rounded-xl p-5 w-[280px] flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-white">Filters</h3>
              <button
                onClick={() => setFiltersCollapsed(true)}
                className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                Collapse
              </button>
            </div>

            {/* Active Filters */}
            {filters.length > 0 && (
              <div className="space-y-2 mb-4">
                {filters.map((f, i) => (
                  <div
                    key={i}
                    className="bg-slate-800/60 p-2.5 rounded-lg space-y-1.5"
                  >
                    {/* Row 1: Field selector */}
                    <select
                      value={f.field}
                      onChange={(e) => updateFilter(i, "field", e.target.value)}
                      className="w-full bg-slate-700 text-slate-200 text-xs rounded-md px-2 py-1.5 border border-slate-600 outline-none cursor-pointer"
                    >
                      <option value="">Select field...</option>
                      {FILTER_FIELDS.map((ff) => (
                        <option key={ff.value} value={ff.value}>
                          {ff.label}
                        </option>
                      ))}
                    </select>
                    {/* Row 2: Operator + Value + Remove */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={f.operator}
                        onChange={(e) =>
                          updateFilter(i, "operator", e.target.value)
                        }
                        className="bg-slate-700 text-slate-200 text-xs rounded-md px-2 py-1.5 border border-slate-600 outline-none w-[50px] cursor-pointer"
                      >
                        {OPERATORS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={f.value}
                        onChange={(e) =>
                          updateFilter(i, "value", e.target.value)
                        }
                        placeholder="Value"
                        className="flex-1 bg-slate-700 text-slate-200 text-xs rounded-md px-2 py-1.5 border border-slate-600 outline-none min-w-0"
                      />
                      <button
                        onClick={() => removeFilter(i)}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-red-500/10 text-red-400 
                                   hover:bg-red-500/20 cursor-pointer flex-shrink-0 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add + Apply */}
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={addFilter}
                className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer font-medium"
              >
                + Add filter
              </button>
              {filters.length > 0 && (
                <button
                  onClick={applyFilters}
                  className="text-xs bg-green-500/20 text-green-400 px-3 py-1.5 rounded-md 
                             hover:bg-green-500/30 cursor-pointer font-medium border border-green-500/30"
                >
                  Apply Filters
                </button>
              )}
            </div>

            {/* Sector Checkboxes */}
            <div className="border-t border-slate-700/40 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Sectors
                </h4>
                {selectedSectors.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedSectors([]);
                      setCurrentPage(1);
                    }}
                    className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    Clear ({selectedSectors.length})
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {sectors.map((sector) => (
                  <label
                    key={sector}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSectors.includes(sector)}
                      onChange={() => toggleSector(sector)}
                      className="accent-green-500 rounded w-3.5 h-3.5 cursor-pointer"
                    />
                    <span
                      className={`text-xs transition-colors ${
                        selectedSectors.includes(sector)
                          ? "text-green-400 font-medium"
                          : "text-slate-400 group-hover:text-white"
                      }`}
                    >
                      {sector.charAt(0) +
                        sector.slice(1).toLowerCase().replace(/_/g, " ")}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Collapsed sidebar toggle */}
        {filtersCollapsed && (
          <button
            onClick={() => setFiltersCollapsed(false)}
            className="bg-[#111827] border border-slate-700/40 rounded-xl p-3 cursor-pointer 
                       hover:border-slate-500 transition-all flex-shrink-0"
            title="Show filters"
          >
            <span className="text-slate-400 text-sm">☰</span>
          </button>
        )}

        {/* ── Results ──────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="bg-[#111827] border border-slate-700/40 rounded-xl p-5">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[15px] font-bold text-white">
                  Results ({filteredStocks.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Analytical ranking based on demo data, not investment advice.
                </p>
              </div>
              {selectedSectors.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {selectedSectors.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-md border border-green-500/25"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 mt-3 text-sm">
                  Screening stocks...
                </p>
              </div>
            )}

            {!loading && paginatedStocks.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <TH field="company_name">Company</TH>
                        <TH field="price" right>
                          Price
                        </TH>
                        <TH field="market_cap" right>
                          Market Cap
                        </TH>
                        <TH field="pe_ratio" right>
                          P/E
                        </TH>
                        <TH field="change_percent" right>
                          Change%
                        </TH>
                        <TH field="roe" right>
                          ROE
                        </TH>
                        <TH field="eps" right>
                          EPS
                        </TH>
                        <TH field="rsi_14" right>
                          RSI
                        </TH>
                        <TH field="dividend_yield" right>
                          Div Yield
                        </TH>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedStocks.map((s) => (
                        <tr
                          key={s.ticker}
                          onClick={() => navigate(`/stock/${s.ticker}`)}
                          className="border-b border-slate-700/25 hover:bg-slate-700/20 cursor-pointer transition-colors group"
                        >
                          <td className="px-3 py-3">
                            <p className="text-white font-medium group-hover:text-green-400 transition-colors">
                              {s.companyName || cleanTicker(s.ticker)}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {cleanTicker(s.ticker)}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-right text-slate-200 font-medium">
                            {fmtPrice(s.price)}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-300 text-xs">
                            {fmtMcap(s.marketCap)}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-300">
                            {fmtNum(s.peRatio)}
                          </td>
                          <td
                            className={`px-3 py-3 text-right font-semibold text-xs
                            ${Number(s.changePercent || 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                          >
                            {s.changePercent != null
                              ? `${Number(s.changePercent) >= 0 ? "▲" : "▼"} ${fmtPct(s.changePercent)}`
                              : "—"}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-300 text-xs">
                            {s.roe != null
                              ? `${(Number(s.roe) * 100).toFixed(1)}%`
                              : "—"}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-300">
                            {fmtNum(s.eps)}
                          </td>
                          <td className="px-3 py-3 text-right">
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
                          <td className="px-3 py-3 text-right text-slate-300 text-xs">
                            {s.dividendYield != null
                              ? `${(Number(s.dividendYield) * 100).toFixed(2)}%`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ═══ Pagination ═══════════════════════ */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-700/30">
                    <p className="text-xs text-slate-500">
                      Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                      {Math.min(currentPage * PAGE_SIZE, filteredStocks.length)}{" "}
                      of {filteredStocks.length} stocks
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
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
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
                          const showEllipsis = i > 0 && page - arr[i - 1] > 1;
                          return (
                            <span key={page}>
                              {showEllipsis && (
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
              </>
            )}

            {!loading && filteredStocks.length === 0 && (
              <div className="text-center py-16">
                <span className="text-4xl">🔍</span>
                <p className="text-slate-400 mt-3">
                  No stocks match your filters
                </p>
                <button
                  onClick={handleReset}
                  className="mt-3 text-sm text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
