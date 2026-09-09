import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <span className="text-2xl">📊</span>
          <h1 className="text-xl font-bold text-white">Stock Screener</h1>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-slate-400">
          <Link to="/" className="hover:text-white transition-colors">
            Screener
          </Link>
        </nav>
      </div>
    </header>
  );
}
