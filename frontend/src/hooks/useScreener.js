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
      .map(({ id, ...rest }) => {
        // Clean up the filter for the API:
        // - Remove the UI-only 'id' field
        // - Convert 'between' values from strings to numbers
        const cleaned = { ...rest };

        // If operator is 'between', ensure value is an array of numbers
        if (cleaned.operator === "between" && Array.isArray(cleaned.value)) {
          cleaned.value = cleaned.value.map((v) => Number(v));
        }

        // Convert single numeric values from string to number
        if (
          ["gt", "gte", "lt", "lte", "eq", "neq"].includes(cleaned.operator)
        ) {
          const num = Number(cleaned.value);
          if (!isNaN(num) && cleaned.value !== "") {
            cleaned.value = num;
          }
        }

        // Handle column comparison: when operator was 'col_compare'
        // the FilterRow sets refField and changes operator to 'gt'
        if (cleaned.operator === "col_compare") {
          cleaned.operator = "gt";
        }

        return cleaned;
      });

    // Allow empty filters — returns all stocks
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
