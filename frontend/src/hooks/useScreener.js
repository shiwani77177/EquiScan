import { useCallback } from "react";
import useScreenerStore from "../store/useScreenerStore";
import { screenStocks } from "../services/api";

export default function useScreener() {
  const { filters, sort, page, size, setResults, setLoading, setError } =
    useScreenerStore();

  const runScreen = useCallback(async () => {
    // Strip out incomplete filters (no field or value selected yet)
    const validFilters = filters
      .filter((f) => f.field && (f.value !== "" || f.refField))
      .map(({ id, ...rest }) => rest); // remove the UI-only id

    if (validFilters.length === 0) {
      setError("Add at least one filter before screening.");
      return;
    }

    try {
      setLoading();
      const results = await screenStocks(validFilters, sort, page, size);
      setResults(results);
    } catch (err) {
      const message =
        err.response?.data?.error || err.message || "Something went wrong";
      setError(message);
    }
  }, [filters, sort, page, size, setResults, setLoading, setError]);

  return { runScreen };
}
