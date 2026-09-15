import { Link } from "react-router-dom";

export default function WatchlistPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <h2 className="text-2xl font-bold text-white mb-1">Watchlist</h2>
      <p className="text-slate-400 text-sm mb-6">Track your favorite stocks</p>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
        <span className="text-5xl">⭐</span>
        <h3 className="text-xl font-semibold text-white mt-4">
          Your Watchlist is Empty
        </h3>
        <p className="text-slate-400 mt-2 max-w-md mx-auto">
          Start tracking stocks by clicking the star icon on any stock. Login
          required to save your watchlist across sessions.
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <Link
            to="/screener"
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-500 no-underline"
          >
            Open Screener
          </Link>
          <Link
            to="/stocks"
            className="px-6 py-2.5 bg-slate-700 text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-600 no-underline"
          >
            Browse Stocks
          </Link>
        </div>
      </div>
    </div>
  );
}
