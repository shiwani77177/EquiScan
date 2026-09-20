import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import DashboardPage from "./pages/DashboardPage";
import ScreenerPage from "./pages/ScreenerPage";
import StocksPage from "./pages/StocksPage";
import SectorsPage from "./pages/SectorsPage";
import WatchlistPage from "./pages/WatchlistPage";
import NewsPage from "./pages/NewsPage";
import StockDetailPage from "./pages/StockDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900">
        <Header />
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/screener" element={<ScreenerPage />} />
          <Route path="/stocks" element={<StocksPage />} />
          <Route path="/sectors" element={<SectorsPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/stock/:ticker" element={<StockDetailPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
