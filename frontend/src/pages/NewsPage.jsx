import { useEffect, useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "/api/v1", timeout: 15000 });

export default function NewsPage() {
  const [news, setNews] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [activeSector, setActiveSector] = useState("All");
  const [loading, setLoading] = useState(true);

  const fetchNews = (sector) => {
    setLoading(true);
    const params = sector && sector !== "All" ? { sector } : {};
    api
      .get("/news", { params })
      .then(({ data }) => {
        setNews(data.news || []);
        if (data.sectors) setSectors(data.sectors);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNews(activeSector);
  }, [activeSector]);

  const handleSectorClick = (sector) => {
    setActiveSector(sector);
  };

  // Sector badge colors
  const sectorColor = (s) => {
    const colors = {
      Energy: "bg-orange-500/15 text-orange-400 border-orange-500/30",
      Banking: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      IT: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
      Pharma: "bg-green-500/15 text-green-400 border-green-500/30",
      Auto: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      Metals: "bg-slate-400/15 text-slate-300 border-slate-400/30",
      FMCG: "bg-pink-500/15 text-pink-400 border-pink-500/30",
      "Financial Services":
        "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
      Infrastructure: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      Realty: "bg-teal-500/15 text-teal-400 border-teal-500/30",
      Chemicals: "bg-lime-500/15 text-lime-400 border-lime-500/30",
      Telecom: "bg-violet-500/15 text-violet-400 border-violet-500/30",
      Markets: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    };
    return colors[s] || "bg-slate-500/15 text-slate-400 border-slate-500/30";
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Market News
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Latest headlines across sectors and stocks.
          </p>
        </div>
        <span className="hidden sm:block text-xs text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg border border-red-400/20 font-medium">
          Demo data — not live market data
        </span>
      </div>

      {/* News Card */}
      <div className="bg-[#111827] border border-slate-700/40 rounded-xl p-6">
        {/* Header + Count */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white">Headlines</h3>
          <p className="text-sm text-slate-500">
            {news.length} of {news.length} stories
          </p>
        </div>

        {/* Sector Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-slate-700/40">
          <button
            onClick={() => handleSectorClick("All")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer
              ${
                activeSector === "All"
                  ? "bg-white text-slate-900 border-white"
                  : "bg-transparent text-slate-400 border-slate-600 hover:border-slate-400 hover:text-white"
              }`}
          >
            All
          </button>
          {sectors.map((s) => (
            <button
              key={s}
              onClick={() => handleSectorClick(s)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer
                ${
                  activeSector === s
                    ? "bg-white text-slate-900 border-white"
                    : "bg-transparent text-slate-400 border-slate-600 hover:border-slate-400 hover:text-white"
                }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* News Items */}
        {!loading && (
          <div className="space-y-0">
            {news.map((item, i) => (
              <a
                key={item.id || i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-5 border-b border-slate-700/30 last:border-0 hover:bg-slate-800/30 
                           -mx-2 px-4 rounded-lg transition-colors no-underline group"
              >
                {/* Title + Sector Badge */}
                <div className="flex items-start justify-between gap-4">
                  <h4 className="text-[15px] text-white font-semibold leading-snug group-hover:text-green-400 transition-colors">
                    {item.title}
                  </h4>
                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-md border font-medium flex-shrink-0 ${sectorColor(item.sector)}`}
                  >
                    {item.sector}
                  </span>
                </div>

                {/* Source + Time */}
                <p className="text-xs text-slate-500 mt-1.5">
                  <span className="text-slate-400 font-medium">
                    {item.source}
                  </span>
                  <span className="mx-1.5">·</span>
                  {item.time}
                </p>

                {/* Summary */}
                <p className="text-sm text-slate-400 mt-2.5 leading-relaxed">
                  {item.summary}
                </p>

                {/* Ticker Tags */}
                {item.tickers && item.tickers.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {item.tickers.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] px-2 py-0.5 rounded bg-green-500/15 text-green-400 
                                               border border-green-500/25 font-semibold tracking-wide"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </a>
            ))}

            {news.length === 0 && !loading && (
              <p className="text-center py-12 text-slate-500">
                No news available for this sector
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
