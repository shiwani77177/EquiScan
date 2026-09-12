package com.project.stock_screener.dto;

import java.util.List;

/**
 * ScreenResult — The complete response the API sends back to the frontend.
*/

public class ScreenResult {

    // The actual stock data for this page
    private List<StockRow> data;

    // Which page this is (0-based: 0 = first page)
    private int page;

    // Results per page
    private int size;

    // Total number of matching stocks across ALL pages
    // Example: 127 stocks match, showing 50 per page
    private long totalElements;

    // Total number of pages = ceil(totalElements / size)
    // Example: ceil(127 / 50) = 3 pages
    private int totalPages;

    // Constructors

    public ScreenResult() {
    }

    /* Full constructor — used by ScreenerService to build the response. */
    public ScreenResult(List<StockRow> data, int page, int size, long totalElements) {
        this.data = data;
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        // Calculate total pages: ceil(127 / 50) = 3
        // (int) Math.ceil converts 2.54 → 3 (always rounds up)
        this.totalPages = (int) Math.ceil((double) totalElements / size);
    }

    public List<StockRow> getData() { return data; }
    public void setData(List<StockRow> data) { this.data = data; }

    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }

    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }

    public long getTotalElements() { return totalElements; }
    public void setTotalElements(long totalElements) { this.totalElements = totalElements; }

    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }
}

