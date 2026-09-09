import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import StockDetailPage from "./pages/StockDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/stock/:ticker" element={<StockDetailPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
