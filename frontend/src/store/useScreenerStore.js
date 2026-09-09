import { create } from "zustand";

const DEFAULT_SORT = { field: "market_cap", direction: "desc" };

const useScreenerStore = create((set, get) => ({
  // ── Filter state ────────────────────────────────────────
  filters: [],
  sort: DEFAULT_SORT,
  page: 0,
  size: 50,

  // ── Results ─────────────────────────────────────────────
  results: null,
  loading: false,
  error: null,

  // ── Actions ─────────────────────────────────────────────
  addFilter: () =>
    set((state) => ({
      filters: [
        ...state.filters,
        { id: Date.now(), field: "", operator: "gte", value: "" },
      ],
    })),

  updateFilter: (id, updates) =>
    set((state) => ({
      filters: state.filters.map((f) =>
        f.id === id ? { ...f, ...updates } : f,
      ),
    })),

  removeFilter: (id) =>
    set((state) => ({
      filters: state.filters.filter((f) => f.id !== id),
    })),

  setSort: (sort) => set({ sort }),
  setPage: (page) => set({ page }),
  setSize: (size) => set({ size, page: 0 }),

  resetFilters: () =>
    set({ filters: [], sort: DEFAULT_SORT, page: 0, results: null }),

  // ── Preset screens ─────────────────────────────────────
  applyPreset: (preset) => set({ filters: preset, page: 0 }),

  // ── API state ───────────────────────────────────────────
  setResults: (results) => set({ results, loading: false, error: null }),
  setLoading: () => set({ loading: true, error: null }),
  setError: (error) => set({ error, loading: false }),
}));

// ── Preset filter configs ─────────────────────────────────
export const PRESETS = {
  value: {
    label: "Value Stocks",
    filters: [
      { id: 1, field: "pe_ratio", operator: "between", value: [0, 15] },
      { id: 2, field: "dividend_yield", operator: "gte", value: 2 },
      { id: 3, field: "market_cap", operator: "gte", value: 1_000_000_000 },
    ],
  },
  oversold: {
    label: "Oversold",
    filters: [
      { id: 1, field: "rsi_14", operator: "lte", value: 30 },
      { id: 2, field: "market_cap", operator: "gte", value: 500_000_000 },
    ],
  },
  growthTech: {
    label: "Growth Tech",
    filters: [
      { id: 1, field: "sector", operator: "eq", value: "Technology" },
      { id: 2, field: "revenue", operator: "gte", value: 1_000_000_000 },
      { id: 3, field: "pe_ratio", operator: "gte", value: 20 },
    ],
  },
  goldenCross: {
    label: "Golden Cross",
    filters: [
      { id: 1, field: "sma_50", operator: "gt", refField: "sma_200" },
      { id: 2, field: "market_cap", operator: "gte", value: 1_000_000_000 },
    ],
  },
};

export default useScreenerStore;
