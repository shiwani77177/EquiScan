import useScreenerStore, { PRESETS } from "../store/useScreenerStore";
import useScreener from "../hooks/useScreener";
import FilterRow from "./FilterRow";

export default function FilterBuilder() {
  const {
    filters,
    addFilter,
    updateFilter,
    removeFilter,
    resetFilters,
    applyPreset,
    loading,
  } = useScreenerStore();
  const { runScreen } = useScreener();

  const handlePreset = (key) => {
    applyPreset(PRESETS[key].filters);
    // Auto-run after a tick so state updates
    setTimeout(
      () => useScreenerStore.getState().filters.length && runScreen(),
      0,
    );
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Filters</h2>
        <button
          onClick={resetFilters}
          className="text-sm text-slate-400 hover:text-white cursor-pointer"
        >
          Reset all
        </button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(PRESETS).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => handlePreset(key)}
            className="px-3 py-1.5 text-xs font-medium rounded-full 
                       bg-slate-700 text-slate-300 hover:bg-blue-600 
                       hover:text-white transition-colors cursor-pointer"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Filter rows */}
      <div className="space-y-3 mb-4">
        {filters.length === 0 && (
          <p className="text-slate-500 text-sm italic">
            No filters added yet. Click "Add Filter" or pick a preset above.
          </p>
        )}
        {filters.map((filter) => (
          <FilterRow
            key={filter.id}
            filter={filter}
            onUpdate={(updates) => updateFilter(filter.id, updates)}
            onRemove={() => removeFilter(filter.id)}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={addFilter}
          className="px-4 py-2 text-sm font-medium rounded-lg
                     bg-slate-700 text-slate-300 hover:bg-slate-600 cursor-pointer"
        >
          + Add Filter
        </button>
        <button
          onClick={runScreen}
          disabled={loading}
          className="px-6 py-2 text-sm font-semibold rounded-lg
                     bg-blue-600 text-white hover:bg-blue-500
                     disabled:bg-slate-600 disabled:text-slate-400
                     disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          {loading ? "Screening..." : "Screen Stocks"}
        </button>
      </div>
    </div>
  );
}
