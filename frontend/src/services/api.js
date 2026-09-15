import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Screening
/* screenStocks — Calls POST /api/v1/screen with filters */
export const screenStocks = async (filters, sort, page = 0, size = 50) => {
  const { data } = await api.post("/screen", { filters, sort, page, size });
  return data;
};

// Metadata
/* getFilterMetadata — Calls GET /api/v1/metadata/filters */
export const getFilterMetadata = async () => {
  const { data } = await api.get("/metadata/filters");
  return data;
};

/**
 * getSectors — Calls GET /api/v1/metadata/sectors
 * Returns array of unique sector names: ["TECHNOLOGY", "FINANCIAL SERVICES"]
 */
export const getSectors = async () => {
  const { data } = await api.get("/metadata/sectors");
  return data;
};

// Stock Detail

/**
 * getStockDetail — Calls GET /api/v1/stocks/{ticker}
 * Returns full stock info from the materialized view
 */
export const getStockDetail = async (ticker) => {
  const { data } = await api.get(`/stocks/${ticker}`);
  return data;
};

/**
 * getStockPrices — Calls GET /api/v1/stocks/{ticker}/prices
 * Returns OHLCV + SMA data for the price chart
 *
 * @param ticker  Stock symbol (e.g., "AAPL")
 * @param months  How many months of history (1, 3, 6, 12)
 * @returns Array of price objects sorted by date ascending
 */
export const getStockPrices = async (ticker, months = 3) => {
  const { data } = await api.get(`/stocks/${ticker}/prices`, {
    params: { months },
  });
  return data;
};

// Manual Ingestion Trigger

/**
 * triggerIngestion — Calls POST /api/v1/admin/ingest
 * Starts data ingestion in the background
 */
export const triggerIngestion = async () => {
  const { data } = await api.post("/admin/ingest");
  return data;
};

export default api;
