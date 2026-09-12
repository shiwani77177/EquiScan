package com.project.stock_screener.dto;

/**
 * SortCriteria — Tells the screener how to order the results.
 *
 * EXAMPLE:
 *   User wants results sorted by market cap, biggest first:
 *   { field: "market_cap", direction: "desc" }
 * 
 * DEFAULT:
 *   If the user doesn't specify sorting, we default to
 *   market_cap descending (biggest companies first).
 */
public class SortCriteria {

    // Column to sort by 
    private String field;

    // asc or desc
    private String direction;

    // Constructors

    // Empty constructor (needed for JSON deserialization)
    public SortCriteria() {
        // Default: biggest market cap first
        this.field = "market_cap";
        this.direction = "desc";
    }

    // Constructor with parameters (for manual creation in code)
    public SortCriteria(String field, String direction) {
        this.field = field;
        this.direction = direction;
    }

    public String getField() { return field; }
    public void setField(String field) { this.field = field; }

    public String getDirection() { return direction; }
    public void setDirection(String direction) { this.direction = direction; }
}


