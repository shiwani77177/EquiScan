import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: "📊" },
  { path: "/screener", label: "Screener", icon: "🔍" },
  { path: "/stocks", label: "Stocks", icon: "📋" },
  { path: "/sectors", label: "Sectors", icon: "🏢" },
  { path: "/watchlist", label: "Watchlist", icon: "⭐" },
];

export default function Header() {
  const location = useLocation();

  return (
    <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Top row: Logo + Search */}
        <div className="flex items-center justify-between py-3">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <span className="text-2xl">📈</span>
            <h1 className="text-xl font-bold">
              <span className="text-blue-400">Equi</span>
              <span className="text-white">Scan</span>
            </h1>
          </Link>

          {/* Search bar */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search company, ticker, sector..."
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-9 pr-4 py-2 
                           text-sm text-slate-200 placeholder-slate-500 
                           focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Settings icon */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded hidden sm:block">
              US Market Data
            </span>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto scrollbar-hide">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium 
                           whitespace-nowrap transition-colors border-b-2 no-underline
                           ${
                             isActive
                               ? "border-blue-500 text-white bg-slate-700/50 rounded-t-lg"
                               : "border-transparent text-slate-400 hover:text-white hover:border-slate-500"
                           }`}
              >
                <span className="text-xs">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
