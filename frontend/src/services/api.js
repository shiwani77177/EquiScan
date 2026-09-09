import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ── Screening ─────────────────────────────────────────────
export const screenStocks = async (filters, sort, page = 0, size = 50) => {
  const { data } = await api.post("/screen", { filters, sort, page, size });
  return data;
};

// ── Metadata ──────────────────────────────────────────────
export const getFilterMetadata = async () => {
  const { data } = await api.get("/metadata/filters");
  return data;
};

export const getSectors = async () => {
  const { data } = await api.get("/metadata/sectors");
  return data;
};

// ── Stock Detail ──────────────────────────────────────────
export const getStockDetail = async (ticker) => {
  const { data } = await api.get(`/stocks/${ticker}`);
  return data;
};

export const getStockPrices = async (ticker, months = 3) => {
  const { data } = await api.get(`/stocks/${ticker}/prices`, {
    params: { months },
  });
  return data;
};

export default api;
