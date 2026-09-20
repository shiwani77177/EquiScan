import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: "📊" },
  { path: "/screener", label: "Screener", icon: "🔍" },
  { path: "/stocks", label: "Stocks", icon: "📋" },
  { path: "/sectors", label: "Sectors", icon: "🏢" },
  { path: "/watchlist", label: "Watchlist", icon: "⭐" },
  { path: "/news", label: "News", icon: "📰" },
];

export default function Header() {
  const location = useLocation();
  const [dark, setDark] = useState(
    () => localStorage.getItem("equiscan-theme") !== "light",
  );

  useEffect(() => {
    if (dark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("equiscan-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("equiscan-theme", "light");
    }
  }, [dark]);

  return (
    <header className="bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between py-3 gap-4">
          <Link
            to="/"
            className="flex items-center gap-0.5 no-underline flex-shrink-0"
          >
            <span className="text-green-400 text-[22px] font-black italic">
              Equi
            </span>
            <span className="text-white text-[22px] font-black">Scan</span>
            <span className="text-green-400/80 text-sm font-semibold ml-1 hidden sm:inline">
              Screener
            </span>
          </Link>

          <div className="hidden md:flex items-center flex-1 max-w-lg mx-6">
            <div className="relative w-full">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
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
                placeholder="Search company, ticker, sector..."
                className="w-full bg-slate-700/50 border border-slate-600/40 rounded-xl pl-10 pr-4 py-2.5
                           text-sm text-slate-200 placeholder-slate-500
                           focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="hidden lg:block text-xs text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg border border-red-400/20 font-medium">
              Demo data — not live
            </span>
            <button
              onClick={() => setDark(!dark)}
              className="relative w-[52px] h-[28px] rounded-full transition-colors duration-300 cursor-pointer border flex items-center px-[3px]"
              style={{
                backgroundColor: dark ? "#334155" : "#bfdbfe",
                borderColor: dark ? "#475569" : "#93c5fd",
              }}
            >
              <div
                className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] transition-all duration-300 shadow-md"
                style={{
                  transform: dark ? "translateX(0px)" : "translateX(22px)",
                  backgroundColor: dark ? "#1e293b" : "#fbbf24",
                }}
              >
                {dark ? "🌙" : "☀️"}
              </div>
            </button>
          </div>
        </div>

        <nav className="flex items-center gap-0.5 -mb-px overflow-x-auto pb-0">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
                  whitespace-nowrap transition-all border-b-2 no-underline rounded-t-md
                  ${
                    active
                      ? "border-green-400 text-white bg-green-400/5"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/20"
                  }`}
              >
                <span className="text-sm">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
