const OPERATORS = {
  numeric: [
    { value: "gt", label: ">" },
    { value: "gte", label: ">=" },
    { value: "lt", label: "<" },
    { value: "lte", label: "<=" },
    { value: "eq", label: "=" },
    { value: "between", label: "Between" },
  ],
  text: [
    { value: "eq", label: "=" },
    { value: "in", label: "In" },
  ],
};

const FIELDS = [
  {
    value: "market_cap",
    label: "Market Cap",
    type: "numeric",
    category: "General",
  },
  { value: "price", label: "Price", type: "numeric", category: "General" },
  { value: "volume", label: "Volume", type: "numeric", category: "General" },
  {
    value: "change_percent",
    label: "Change %",
    type: "numeric",
    category: "General",
  },
  { value: "sector", label: "Sector", type: "text", category: "General" },
  { value: "industry", label: "Industry", type: "text", category: "General" },
  {
    value: "pe_ratio",
    label: "P/E Ratio",
    type: "numeric",
    category: "Fundamental",
  },
  { value: "eps", label: "EPS", type: "numeric", category: "Fundamental" },
  {
    value: "dividend_yield",
    label: "Dividend Yield",
    type: "numeric",
    category: "Fundamental",
  },
  {
    value: "debt_to_equity",
    label: "Debt/Equity",
    type: "numeric",
    category: "Fundamental",
  },
  { value: "roe", label: "ROE", type: "numeric", category: "Fundamental" },
  {
    value: "price_to_book",
    label: "P/B Ratio",
    type: "numeric",
    category: "Fundamental",
  },
  {
    value: "revenue",
    label: "Revenue",
    type: "numeric",
    category: "Fundamental",
  },
  {
    value: "free_cash_flow",
    label: "Free Cash Flow",
    type: "numeric",
    category: "Fundamental",
  },
  { value: "sma_50", label: "SMA 50", type: "numeric", category: "Technical" },
  {
    value: "sma_200",
    label: "SMA 200",
    type: "numeric",
    category: "Technical",
  },
  { value: "rsi_14", label: "RSI 14", type: "numeric", category: "Technical" },
  { value: "macd", label: "MACD", type: "numeric", category: "Technical" },
];

// Fields that can be used in column-to-column comparisons
const COMPARABLE_FIELDS = FIELDS.filter((f) => f.type === "numeric");

export default function FilterRow({ filter, onUpdate, onRemove }) {
  const selectedField = FIELDS.find((f) => f.value === filter.field);
  const fieldType = selectedField?.type || "numeric";
  const ops = OPERATORS[fieldType] || OPERATORS.numeric;

  const inputClasses =
    "bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Field selector */}
      <select
        className={inputClasses + " min-w-[140px]"}
        value={filter.field}
        onChange={(e) =>
          onUpdate({ field: e.target.value, value: "", refField: undefined })
        }
      >
        <option value="">Select field...</option>
        {["General", "Fundamental", "Technical"].map((cat) => (
          <optgroup key={cat} label={cat}>
            {FIELDS.filter((f) => f.category === cat).map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Operator selector */}
      <select
        className={inputClasses + " min-w-[80px]"}
        value={filter.operator}
        onChange={(e) =>
          onUpdate({ operator: e.target.value, value: "", refField: undefined })
        }
      >
        {ops.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
        {fieldType === "numeric" && (
          <option value="col_compare">vs Column</option>
        )}
      </select>

      {/* Value input — changes based on operator */}
      {filter.operator === "col_compare" ? (
        <select
          className={inputClasses + " min-w-[140px]"}
          value={filter.refField || ""}
          onChange={(e) =>
            onUpdate({ refField: e.target.value, operator: "gt" })
          }
        >
          <option value="">Compare to...</option>
          {COMPARABLE_FIELDS.filter((f) => f.value !== filter.field).map(
            (f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ),
          )}
        </select>
      ) : filter.operator === "between" ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            className={inputClasses + " w-28"}
            placeholder="Min"
            value={Array.isArray(filter.value) ? filter.value[0] : ""}
            onChange={(e) => {
              const arr = Array.isArray(filter.value)
                ? [...filter.value]
                : ["", ""];
              arr[0] = e.target.value;
              onUpdate({ value: arr });
            }}
          />
          <span className="text-slate-400 text-sm">to</span>
          <input
            type="number"
            className={inputClasses + " w-28"}
            placeholder="Max"
            value={Array.isArray(filter.value) ? filter.value[1] : ""}
            onChange={(e) => {
              const arr = Array.isArray(filter.value)
                ? [...filter.value]
                : ["", ""];
              arr[1] = e.target.value;
              onUpdate({ value: arr });
            }}
          />
        </div>
      ) : (
        <input
          type={fieldType === "numeric" ? "number" : "text"}
          className={inputClasses + " w-40"}
          placeholder="Value..."
          value={filter.value}
          onChange={(e) => onUpdate({ value: e.target.value })}
        />
      )}

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="text-red-400 hover:text-red-300 text-lg px-2 cursor-pointer"
        title="Remove filter"
      >
        ✕
      </button>
    </div>
  );
}
