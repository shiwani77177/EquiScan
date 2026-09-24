import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { screenStocks, getSectors, getFilterMetadata } from "../services/api";

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

// ── Presets ───────────────────────────────────────────────
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

// ── Filter operators ──────────────────────────────────────
const OPERATORS = [
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less or equal" },
  { value: "eq", label: "Equal to" },
];

// ── Available filter fields ───────────────────────────────
const FILTER_FIELDS = [
  { value: "pe_ratio", label: "P/E Ratio" },
  { value: "eps", label: "EPS" },
  { value: "roe", label: "ROE" },
  { value: "dividend_yield", label: "Dividend Yield" },
  { value: "debt_to_equity", label: "Debt to Equity" },
  { value: "price_to_book", label: "Price to Book" },
  { value: "market_cap", label: "Market Cap" },
  { value: "rsi_14", label: "RSI (14)" },
  { value: "sma_50", label: "SMA 50" },
  { value: "sma_200", label: "SMA 200" },
  { value: "change_percent", label: "Change %" },
  { value: "price", label: "Price" },
  { value: "volume", label: "Volume" },
  { value: "revenue", label: "Revenue" },
  { value: "net_income", label: "Net Income" },
  { value: "free_cash_flow", label: "Free Cash Flow" },
];

export default function ScreenerPage() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  // Filters state
  const [filters, setFilters] = useState([]);
  const [selectedSectors, setSelectedSectors] = useState([]);
  const [matchMode, setMatchMode] = useState("all"); // 'all' or 'any'

  // Sort state
  const [sortField, setSortField] = useState("market_cap");
  const [sortDir, setSortDir] = useState("desc");

  // Load sectors on mount
  useEffect(() => {
    getSectors().then(setSectors).catch(console.error);
    runScreen([], []);
  }, []);

  // Run screen
  const runScreen = useCallback(
    async (activeFilters, activeSectors) => {
      setLoading(true);
      setError(null);
      try {
        const allFilters = [...activeFilters];

        // Add sector filter if sectors selected
        if (activeSectors.length > 0) {
          activeSectors.forEach((s) => {
            allFilters.push({ field: "sector", operator: "eq", value: s });
          });
        }

        const result = await screenStocks(
          allFilters,
          { field: sortField, direction: sortDir },
          0,
          100,
        );
        setStocks(result.data || []);
      } catch (err) {
        setError(err.message || "Failed to screen stocks");
      } finally {
        setLoading(false);
      }
    },
    [sortField, sortDir],
  );

  // Handle preset click
  const handlePreset = (preset) => {
    setActivePreset(preset.name);
    setFilters(preset.filters);
    setSelectedSectors([]);
    runScreen(preset.filters, []);
  };

  // Handle reset
  const handleReset = () => {
    setActivePreset(null);
    setFilters([]);
    setSelectedSectors([]);
    runScreen([], []);
  };

  // Handle sector toggle
  const toggleSector = (sector) => {
    const newSectors = selectedSectors.includes(sector)
      ? selectedSectors.filter((s) => s !== sector)
      : [...selectedSectors, sector];
    setSelectedSectors(newSectors);
    runScreen(filters, newSectors);
  };

  // Add a new filter row
  const addFilter = () => {
    setFilters([...filters, { field: "", operator: "gt", value: "" }]);
  };

  // Update a filter
  const updateFilter = (index, key, value) => {
    const newFilters = [...filters];
    newFilters[index] = {
      ...newFilters[index],
      [key]: key === "value" ? Number(value) || value : value,
    };
    setFilters(newFilters);
  };

  // Remove a filter
  const removeFilter = (index) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
    runScreen(newFilters, selectedSectors);
  };

  // Apply filters button
  const applyFilters = () => {
    const validFilters = filters.filter(
      (f) => f.field && f.value !== "" && f.value !== undefined,
    );
    runScreen(validFilters, selectedSectors);
  };

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Re-run screen when sort changes
  useEffect(() => {
    const validFilters = filters.filter(
      (f) => f.field && f.value !== "" && f.value !== undefined,
    );
    runScreen(validFilters, selectedSectors);
  }, [sortField, sortDir]);

  // Sort indicator
  const SortIcon = ({ field }) => {
    if (sortField !== field)
      return <span className="text-slate-600 ml-1">↕</span>;
    return (
      <span className="text-green-400 ml-1">
        {sortDir === "desc" ? "↓" : "↑"}
      </span>
    );
  };

  // Table header
  const TH = ({ field, children, right }) => (
    <th
      onClick={() => handleSort(field)}
      className={`px-3 py-3 text-${right ? "right" : "left"} text-slate-400 text-[11px] uppercase tracking-wider 
                  font-semibold cursor-pointer hover:text-white transition-colors select-none`}
    >
      {children}
      <SortIcon field={field} />
    </th>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
      {/* ═══ Page Header + Presets ══════════════════════ */}
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Stock Screener
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Filter the universe by fundamentals, valuation, technicals and
          ownership.
        </p>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => handlePreset(preset)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all cursor-pointer
              ${
                activePreset === preset.name
                  ? "bg-green-500/20 text-green-400 border-green-500/40"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white"
              }`}
          >
            {preset.name}
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

      {/* ═══ Main Layout: Sidebar + Results ════════════ */}
      <div className="flex gap-5 items-start">
        {/* ── Left Sidebar: Filters ──────────────────── */}
        <div
          className={`bg-[#111827] border border-slate-700/40 rounded-xl p-5 flex-shrink-0 transition-all
          ${filtersCollapsed ? "w-[60px]" : "w-[280px]"}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            {!filtersCollapsed && (
              <h3 className="text-[15px] font-bold text-white">Filters</h3>
            )}
            <button
              onClick={() => setFiltersCollapsed(!filtersCollapsed)}
              className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
            >
              {filtersCollapsed ? "→" : "Collapse"}
            </button>
          </div>

          {!filtersCollapsed && (
            <>
              {/* Match Mode */}
              <div className="flex items-center gap-4 mb-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="match"
                    checked={matchMode === "all"}
                    onChange={() => setMatchMode("all")}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-slate-300">
                    Match ALL filters
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="match"
                    checked={matchMode === "any"}
                    onChange={() => setMatchMode("any")}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-slate-300">
                    Match ANY filter
                  </span>
                </label>
              </div>

              {/* Active Filters */}
              {filters.length > 0 && (
                <div className="space-y-2 mb-4">
                  {filters.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 bg-slate-800/60 p-2 rounded-lg"
                    >
                      <select
                        value={f.field}
                        onChange={(e) =>
                          updateFilter(i, "field", e.target.value)
                        }
                        className="bg-slate-700 text-slate-200 text-xs rounded px-1.5 py-1 border-none outline-none flex-1 cursor-pointer"
                      >
                        <option value="">Select...</option>
                        {FILTER_FIELDS.map((ff) => (
                          <option key={ff.value} value={ff.value}>
                            {ff.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={f.operator}
                        onChange={(e) =>
                          updateFilter(i, "operator", e.target.value)
                        }
                        className="bg-slate-700 text-slate-200 text-xs rounded px-1 py-1 border-none outline-none w-[60px] cursor-pointer"
                      >
                        {OPERATORS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label.split(" ")[0]}
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
                        className="bg-slate-700 text-slate-200 text-xs rounded px-1.5 py-1 border-none outline-none w-[55px]"
                      />
                      <button
                        onClick={() => removeFilter(i)}
                        className="text-red-400 hover:text-red-300 text-xs cursor-pointer px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add filter + Apply */}
              <div className="flex gap-2 mb-5">
                <button
                  onClick={addFilter}
                  className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  + Add filter
                </button>
                {filters.length > 0 && (
                  <button
                    onClick={applyFilters}
                    className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded hover:bg-green-500/30 cursor-pointer"
                  >
                    Apply
                  </button>
                )}
              </div>

              {/* Sector Checkboxes */}
              <div className="border-t border-slate-700/40 pt-4">
                <h4 className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">
                  Sectors
                </h4>
                <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                  {sectors.map((sector) => (
                    <label
                      key={sector}
                      className="flex items-center gap-1.5 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSectors.includes(sector)}
                        onChange={() => toggleSector(sector)}
                        className="accent-green-500 rounded w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="text-xs text-slate-400 group-hover:text-white transition-colors truncate">
                        {sector.charAt(0) + sector.slice(1).toLowerCase()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Right Side: Results Table ───────────────── */}
        <div className="flex-1 min-w-0">
          <div className="bg-[#111827] border border-slate-700/40 rounded-xl p-5">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[15px] font-bold text-white">
                  Results ({stocks.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Analytical ranking based on demo data, not investment advice.
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 mt-3 text-sm">
                  Screening stocks...
                </p>
              </div>
            )}

            {/* Results Table */}
            {!loading && stocks.length > 0 && (
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
                    {stocks.map((s) => (
                      <tr
                        key={s.ticker}
                        onClick={() => navigate(`/stock/${s.ticker}`)}
                        className="border-b border-slate-700/25 hover:bg-slate-700/20 cursor-pointer transition-colors group"
                      >
                        <td className="px-3 py-3">
                          <div>
                            <p className="text-white font-medium group-hover:text-green-400 transition-colors">
                              {s.companyName || cleanTicker(s.ticker)}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {cleanTicker(s.ticker)}
                            </p>
                          </div>
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
            )}

            {/* Empty state */}
            {!loading && stocks.length === 0 && (
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
