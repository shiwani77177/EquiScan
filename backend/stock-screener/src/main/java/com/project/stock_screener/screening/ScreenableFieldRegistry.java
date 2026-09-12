package com.project.stock_screener.screening;

import com.project.stock_screener.exception.InvalidFilterException;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * ScreenableFieldRegistry — The whitelist of all fields users can filter on.
 *
 * WHY THIS EXISTS (SECURITY):
 * ──────────────────────────
 * The user sends filter field names as strings: { "field": "pe_ratio" }
 * If we put that string directly into SQL: "WHERE " + userField + " > 5"
 * A hacker could send: { "field": "1=1; DROP TABLE stocks; --" }
 * Which would destroy your database. This is called SQL INJECTION.
 *
 * The registry prevents this by:
 * 1. Maintaining a WHITELIST of allowed field names
 * 2. Mapping user-facing names to actual SQL column names
 * 3. Rejecting anything not in the whitelist with an exception
 *
 * So "pe_ratio" → allowed, maps to column "pe_ratio" ✓
 * But "1=1; DROP TABLE" → not in whitelist → InvalidFilterException ✗
*/

@Component
public class ScreenableFieldRegistry {

    /* FieldType — Is this field a number or text? */
    public enum FieldType {
        NUMERIC,
        TEXT
    }

    /**
     * FieldDef — Definition of one filterable field.
     *
     * columnName  = the ACTUAL SQL column name in stock_screening_view
     * type        = NUMERIC or TEXT (determines allowed operators)
     * displayName = human-readable name for the frontend dropdown
     * category    = grouping for the frontend (General, Fundamental, Technical)
     */
    public static class FieldDef {
        private final String columnName;
        private final FieldType type;
        private final String displayName;
        private final String category;

        public FieldDef(String columnName, FieldType type, String displayName, String category) {
            this.columnName = columnName;
            this.type = type;
            this.displayName = displayName;
            this.category = category;
        }

        // Getters — no setters because FieldDef is immutable
        public String getColumnName() { return columnName; }
        public FieldType getType() { return type; }
        public String getDisplayName() { return displayName; }
        public String getCategory() { return category; }
    }

    //  THE WHITELIST

    // LinkedHashMap preserves insertion order (so the frontend
    // shows fields in the same order we define them here).
    //
    // Key = the name the user/frontend uses (e.g., "pe_ratio")
    // Value = FieldDef with the actual column name, type, display name, category
    //
    // ADDING A NEW FILTER:
    // To make a new column filterable, just add one line here.
    // The query builder, controller, and frontend all adapt automatically.

    private static final Map<String, FieldDef> FIELDS = new LinkedHashMap<>();

    // Static initializer block — runs once when the class is loaded
    static {
        // General fields
        FIELDS.put("market_cap",      new FieldDef("market_cap",      FieldType.NUMERIC, "Market Cap",   "General"));
        FIELDS.put("price",           new FieldDef("price",           FieldType.NUMERIC, "Price",        "General"));
        FIELDS.put("volume",          new FieldDef("volume",          FieldType.NUMERIC, "Volume",       "General"));
        FIELDS.put("change_percent",  new FieldDef("change_percent",  FieldType.NUMERIC, "Change %",     "General"));
        FIELDS.put("sector",          new FieldDef("sector",          FieldType.TEXT,    "Sector",       "General"));
        FIELDS.put("industry",        new FieldDef("industry",        FieldType.TEXT,    "Industry",     "General"));
        FIELDS.put("exchange",        new FieldDef("exchange",        FieldType.TEXT,    "Exchange",     "General"));

        // Fundamental fields
        FIELDS.put("pe_ratio",        new FieldDef("pe_ratio",        FieldType.NUMERIC, "P/E Ratio",    "Fundamental"));
        FIELDS.put("eps",             new FieldDef("eps",             FieldType.NUMERIC, "EPS",          "Fundamental"));
        FIELDS.put("dividend_yield",  new FieldDef("dividend_yield",  FieldType.NUMERIC, "Dividend Yield","Fundamental"));
        FIELDS.put("debt_to_equity",  new FieldDef("debt_to_equity",  FieldType.NUMERIC, "Debt/Equity",  "Fundamental"));
        FIELDS.put("roe",             new FieldDef("roe",             FieldType.NUMERIC, "ROE",          "Fundamental"));
        FIELDS.put("price_to_book",   new FieldDef("price_to_book",   FieldType.NUMERIC, "P/B Ratio",    "Fundamental"));
        FIELDS.put("revenue",         new FieldDef("revenue",         FieldType.NUMERIC, "Revenue",      "Fundamental"));
        FIELDS.put("free_cash_flow",  new FieldDef("free_cash_flow",  FieldType.NUMERIC, "Free Cash Flow","Fundamental"));

        // Technical fields
        FIELDS.put("sma_50",          new FieldDef("sma_50",          FieldType.NUMERIC, "SMA 50",       "Technical"));
        FIELDS.put("sma_200",         new FieldDef("sma_200",         FieldType.NUMERIC, "SMA 200",      "Technical"));
        FIELDS.put("rsi_14",          new FieldDef("rsi_14",          FieldType.NUMERIC, "RSI 14",       "Technical"));
        FIELDS.put("macd",            new FieldDef("macd",            FieldType.NUMERIC, "MACD",         "Technical"));
    }

    /**
     * resolve — Look up a field by its user-facing key.
     *
     * WHAT IT DOES:
     *   resolve("pe_ratio") → returns the FieldDef for P/E Ratio ✓
     *   resolve("banana")   → throws InvalidFilterException ✗
     *
     * USED BY:
     *   ScreeningQueryBuilder calls this for every filter in the request.
     *   If the field isn't in the whitelist, the query is never built.
     **/
    public FieldDef resolve(String fieldKey) {
        FieldDef def = FIELDS.get(fieldKey);
        if (def == null) {
            throw new InvalidFilterException("Unknown filter field: " + fieldKey);
        }
        return def;
    }

    /**
     * allFields — Returns the complete field registry.
     *
     * USED BY:
     *   The metadata endpoint GET /api/v1/metadata/filters
     *   Returns this map as JSON so the frontend knows what fields
     *   are available, their types, and their display names.
     **/
    public Map<String, FieldDef> allFields() {
        return FIELDS;
    }
}


