import FilterBuilder from "../components/FilterBuilder";
import ResultsTable from "../components/ResultsTable";

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      <FilterBuilder />
      <ResultsTable />
    </div>
  );
}
