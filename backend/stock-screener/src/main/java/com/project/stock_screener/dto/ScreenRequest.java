package com.project.stock_screener.dto;

import java.util.List;

/**
 * ScreenRequest — The complete request body the frontend sends to screen stocks.
 *
 * THIS IS WHAT THE API RECEIVES:
 * When the user clicks "Screen Stocks" on the React frontend, it sends
 * a POST request to /api/v1/screen with this JSON body:
 * 
 * PAGINATION:
 *   page = which page of results (0 = first page)
 *   size = how many results per page (50 = show 50 stocks at a time)
*/
public class ScreenRequest {

    // List of filter conditions
    private List<FilterCriteria> filters;

    // Results defaults to market_cap descending if not specified
    private SortCriteria sort;

    // Which page of results to return(0 == first page, 1 == second page)
    private int page;

    // How many results per page(default 50)
    private int size;

    // Constructor 
    public ScreenRequest() {
        // Sensible defaults if the frontend doesn't send these
        this.sort = new SortCriteria();  // market_cap desc
        this.page = 0;                   // first page
        this.size = 50;                  // 50 results per page
    }

    // Getters and Setters

    public List<FilterCriteria> getFilters() { return filters; }
    public void setFilters(List<FilterCriteria> filters) { this.filters = filters; }

    public SortCriteria getSort() { return sort; }
    public void setSort(SortCriteria sort) { this.sort = sort; }

    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }

    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }
}


