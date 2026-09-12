package com.project.stock_screener.dto;

/**
 * FilterCriteria — Represents ONE filter condition in a screening request.
 *
 * WHAT IS THIS?
 * When a user says "show me stocks with P/E ratio less than 20",
 * that becomes one FilterCriteria object:
 *   field    = "pe_ratio"
 *   operator = "lt"
 *   value    = 20
*/

public class FilterCriteria {

    // Database column to filter on
    private String field;

    // Comparison operator
    private String operator;

    // The value to compare against
    private Object value;

    // Another column name for column-to-column comparison
    private String refField;

    // Constructor 
    public FilterCriteria() {
    }

    // Getters and Setters 

    public String getField() { return field; }
    public void setField(String field) { this.field = field; }

    public String getOperator() { return operator; }
    public void setOperator(String operator) { this.operator = operator; }

    public Object getValue() { return value; }
    public void setValue(Object value) { this.value = value; }

    public String getRefField() { return refField; }
    public void setRefField(String refField) { this.refField = refField; }
}


