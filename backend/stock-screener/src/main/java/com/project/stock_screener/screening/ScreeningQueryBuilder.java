package com.project.stock_screener.screening;

import com.project.stock_screener.dto.FilterCriteria;
import com.project.stock_screener.dto.ScreenRequest;
import com.project.stock_screener.exception.InvalidFilterException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * ScreeningQueryBuilder — Translates user filters into safe SQL queries.
 *
 * THIS IS THE HEART OF THE SCREENER.
 *
 * WHAT IT DOES:
 * Takes a ScreenRequest like:
 *   filters: [
 *     { field: "market_cap", operator: "gte", value: 1000000000 },
 *     { field: "sector",     operator: "eq",  value: "Technology" }
 *   ]
 *   sort: { field: "market_cap", direction: "desc" }
 *   page: 0, size: 50
 *
 * And produces:
 *   SQL:    "SELECT * FROM stock_screening_view WHERE 1=1
 *            AND market_cap >= ? AND sector = ?
 *            ORDER BY market_cap DESC NULLS LAST
 *            LIMIT ? OFFSET ?"
 *   Params: [1000000000, "Technology", 50, 0]
 *
*/

@Component
public class ScreeningQueryBuilder {

    // The field registry for validating and resolving field names
    private final ScreenableFieldRegistry registry;

    public ScreeningQueryBuilder(ScreenableFieldRegistry registry) {
        this.registry = registry;
    }

    /* BuiltQuery — Container for the generated SQL and its parameter values. */
    public static class BuiltQuery {
        private final String sql;
        private final List<Object> params;

        public BuiltQuery(String sql, List<Object> params) {
            this.sql = sql;
            this.params = params;
        }

        public String getSql() { return sql; }
        public List<Object> getParams() { return params; }
    }

    /**
     * build — Builds the main data query (SELECT * with filters, sorting, pagination). */
    public BuiltQuery build(ScreenRequest request) {
        // StringBuilder is more efficient than String + for building long strings
        StringBuilder sql = new StringBuilder("SELECT * FROM stock_screening_view WHERE 1=1");
        List<Object> params = new ArrayList<>();


        if (request.getFilters() != null) {
            for (FilterCriteria filter : request.getFilters()) {
                // Skip incomplete filters (empty field or no value)
                if (filter.getField() == null || filter.getField().isEmpty()) continue;

                // Resolve the field name through the whitelist
                ScreenableFieldRegistry.FieldDef fieldDef = registry.resolve(filter.getField());
                String col = fieldDef.getColumnName();  // The safe, validated column name

                if (filter.getRefField() != null && !filter.getRefField().isEmpty()) {
                    // Column-to-column comparison: sma_50 > sma_200
                    ScreenableFieldRegistry.FieldDef refDef = registry.resolve(filter.getRefField());
                    sql.append(buildColumnComparison(col, filter.getOperator(), refDef.getColumnName()));
                } else {
                    // Column-to-value comparison: pe_ratio < 20
                    appendFilter(sql, params, col, filter.getOperator(), filter.getValue(), fieldDef.getType());
                }
            }
        }

        // Add ORDER BY
        if (request.getSort() != null && request.getSort().getField() != null) {
            ScreenableFieldRegistry.FieldDef sortDef = registry.resolve(request.getSort().getField());
            String direction = "desc".equalsIgnoreCase(request.getSort().getDirection()) ? "DESC" : "ASC";
            // NULLS LAST = put stocks with null values at the end
            // Without this, NULLs appear first in DESC order which is confusing
            sql.append(" ORDER BY ").append(sortDef.getColumnName()).append(" ").append(direction).append(" NULLS LAST");
        } else {
            sql.append(" ORDER BY market_cap DESC NULLS LAST");
        }

        // Add LIMIT and OFFSET for pagination
        // LIMIT = how many rows to return (page size)
        // OFFSET = how many rows to skip (page * size)
        // Page 0, size 50 → LIMIT 50 OFFSET 0  (rows 1-50)
        // Page 1, size 50 → LIMIT 50 OFFSET 50  (rows 51-100)
        // Page 2, size 50 → LIMIT 50 OFFSET 100 (rows 101-150)
        sql.append(" LIMIT ? OFFSET ?");
        params.add(request.getSize());
        params.add(request.getPage() * request.getSize());

        return new BuiltQuery(sql.toString(), params);
    }

    /**
     * buildCount — Builds a COUNT query (same filters but no sorting/pagination).
     *
     * USED FOR:
     * The "127 results found" text and page count calculation.
     * We need to know the TOTAL number of matching stocks, not just the 50 on this page.
     **/

    public BuiltQuery buildCount(ScreenRequest request) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM stock_screening_view WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (request.getFilters() != null) {
            for (FilterCriteria filter : request.getFilters()) {
                if (filter.getField() == null || filter.getField().isEmpty()) continue;

                ScreenableFieldRegistry.FieldDef fieldDef = registry.resolve(filter.getField());
                String col = fieldDef.getColumnName();

                if (filter.getRefField() != null && !filter.getRefField().isEmpty()) {
                    ScreenableFieldRegistry.FieldDef refDef = registry.resolve(filter.getRefField());
                    sql.append(buildColumnComparison(col, filter.getOperator(), refDef.getColumnName()));
                } else {
                    appendFilter(sql, params, col, filter.getOperator(), filter.getValue(), fieldDef.getType());
                }
            }
        }

        return new BuiltQuery(sql.toString(), params);
    }


    //  FILTER BUILDING HELPERS

    /**
     * appendFilter — Adds one WHERE condition to the SQL.
     *
     * This is where each operator type gets translated to SQL:
     *   "eq"      → AND column = ?
     *   "gt"      → AND column > ?
     *   "between" → AND column BETWEEN ? AND ?
     *   "in"      → AND column IN (?, ?, ?)
     **/
    private void appendFilter(StringBuilder sql, List<Object> params,
                              String col, String op, Object value,
                              ScreenableFieldRegistry.FieldType type) {

        // switch expression used to handle multiple cases
        switch (op.toLowerCase()) {
            case "eq" -> {
                sql.append(" AND ").append(col).append(" = ?");
                params.add(castValue(value, type));
            }
            case "neq" -> {
                sql.append(" AND ").append(col).append(" != ?");
                params.add(castValue(value, type));
            }
            case "gt" -> {
                sql.append(" AND ").append(col).append(" > ?");
                params.add(castValue(value, type));
            }
            case "gte" -> {
                sql.append(" AND ").append(col).append(" >= ?");
                params.add(castValue(value, type));
            }
            case "lt" -> {
                sql.append(" AND ").append(col).append(" < ?");
                params.add(castValue(value, type));
            }
            case "lte" -> {
                sql.append(" AND ").append(col).append(" <= ?");
                params.add(castValue(value, type));
            }
            case "between" -> {
                // value must be a List with exactly 2 elements: [min, max]
                if (!(value instanceof List<?> range) || range.size() != 2) {
                    throw new InvalidFilterException("'between' operator needs exactly 2 values: [min, max]");
                }
                sql.append(" AND ").append(col).append(" BETWEEN ? AND ?");
                params.add(castValue(range.get(0), type));
                params.add(castValue(range.get(1), type));
            }
            case "in" -> {
                // value must be a List of values: ["Technology", "Healthcare"]
                if (!(value instanceof List<?> items) || items.isEmpty()) {
                    throw new InvalidFilterException("'in' operator needs a non-empty list of values");
                }
                // Build: IN (?, ?, ?) with one ? per item
                String placeholders = items.stream()
                        .map(i -> "?")
                        .collect(Collectors.joining(", "));
                sql.append(" AND ").append(col).append(" IN (").append(placeholders).append(")");
                items.forEach(item -> params.add(castValue(item, type)));
            }
            default -> throw new InvalidFilterException("Unknown operator: " + op);
        }
    }

    /**
     * buildColumnComparison — Builds SQL for comparing two columns.
     *
     * EXAMPLE:
     *   field="sma_50", operator="gt", refField="sma_200"
     *   → " AND sma_50 > sma_200"
     **/
    private String buildColumnComparison(String leftCol, String op, String rightCol) {
        return switch (op.toLowerCase()) {
            case "gt"  -> " AND " + leftCol + " > " + rightCol;
            case "gte" -> " AND " + leftCol + " >= " + rightCol;
            case "lt"  -> " AND " + leftCol + " < " + rightCol;
            case "lte" -> " AND " + leftCol + " <= " + rightCol;
            case "eq"  -> " AND " + leftCol + " = " + rightCol;
            default -> throw new InvalidFilterException("Invalid operator for column comparison: " + op);
        };
    }

    /* castValue — Converts the user's value to the correct Java type. */
    private Object castValue(Object value, ScreenableFieldRegistry.FieldType type) {
        return switch (type) {
            case NUMERIC -> {
                if (value == null) yield null;
                // Convert whatever number type (Integer, Double, String) to BigDecimal
                yield new BigDecimal(value.toString());
            }
            case TEXT -> {
                if (value == null) yield null;
                yield value.toString();
            }
        };
    }
}


