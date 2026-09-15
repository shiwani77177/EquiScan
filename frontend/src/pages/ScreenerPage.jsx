import FilterBuilder from "../components/FilterBuilder";
import ResultsTable from "../components/ResultsTable";

export default function ScreenerPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Stock Screener</h2>
        <p className="text-slate-400 text-sm mt-1">
          Filter stocks by fundamentals, technicals, and more.
        </p>
      </div>
      <FilterBuilder />
      <ResultsTable />
    </div>
  );
}
