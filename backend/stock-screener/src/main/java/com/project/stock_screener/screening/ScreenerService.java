package com.project.stock_screener.screening;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.project.stock_screener.dto.ScreenRequest;
import com.project.stock_screener.dto.ScreenResult;
import com.project.stock_screener.dto.StockRow;

/**
 * ScreenerService — Executes screening queries and returns results.
 *
 * THIS IS THE BRIDGE between the Controller and the Database.
 **/
@Service
public class ScreenerService {

    private static final Logger log = LoggerFactory.getLogger(ScreenerService.class);

    // JdbcTemplate — executes SQL queries against PostgreSQL
    private final JdbcTemplate jdbc;

    // QueryBuilder — translates filters into SQL
    private final ScreeningQueryBuilder queryBuilder;

    public ScreenerService(JdbcTemplate jdbc, ScreeningQueryBuilder queryBuilder) {
        this.jdbc = jdbc;
        this.queryBuilder = queryBuilder;
    }

    /**
     * screen — The main method. Runs a screening query and returns paginated results.
     *
     * STEP BY STEP:
     *
     * 1. BUILD COUNT QUERY
     *    "SELECT COUNT(*) FROM stock_screening_view WHERE market_cap >= ? AND sector = ?"
     *
     * 2. CHECK IF ANYTHING MATCHES
     *    If count is 0, return an empty result immediately.
     *
     * 3. BUILD DATA QUERY
     *    "SELECT * FROM stock_screening_view WHERE market_cap >= ? AND sector = ?
     *     ORDER BY market_cap DESC NULLS LAST LIMIT 50 OFFSET 0"
     *    → Returns: 50 rows of actual stock data
     *
     * 4. MAP RESULTS
     *    Convert each database row (ResultSet) into a StockRow DTO
     *    that Jackson can serialize to JSON for the frontend.
     *
     * 5. WRAP IN SCREENRESULT
     *    Combine the data + pagination info into one response object.
     *
     */
    @Transactional(readOnly = true)
    public ScreenResult screen(ScreenRequest request) {
        long startTime = System.currentTimeMillis();

        // Step 1: Count total matching stocks
        ScreeningQueryBuilder.BuiltQuery countQuery = queryBuilder.buildCount(request);

        Long total = jdbc.queryForObject(
                countQuery.getSql(),
                Long.class,
                countQuery.getParams().toArray()
        );

        // Step 2: Early return if no matches
        if (total == null || total == 0) {
            log.info("Screen query returned 0 results ({}ms)", System.currentTimeMillis() - startTime);
            return new ScreenResult(List.of(), request.getPage(), request.getSize(), 0);
        }

        // Step 3: Run the data query
        ScreeningQueryBuilder.BuiltQuery dataQuery = queryBuilder.build(request);

        List<StockRow> rows = jdbc.query(
                dataQuery.getSql(),
                this::mapRow,
                dataQuery.getParams().toArray()
        );

        long elapsed = System.currentTimeMillis() - startTime;
        log.info("Screen query: {} results (page {}, {} total) in {}ms",
                rows.size(), request.getPage(), total, elapsed);

        // Step 4: Wrap in ScreenResult
        return new ScreenResult(rows, request.getPage(), request.getSize(), total);
    }

    /**
     * getSectors — Returns all unique sector names from the database.
     *
     * Used by the metadata endpoint so the frontend can populate
     * a dropdown for the sector filter.
     **/
    public List<String> getSectors() {
        return jdbc.queryForList(
                "SELECT DISTINCT sector FROM stock_screening_view WHERE sector IS NOT NULL ORDER BY sector",
                String.class
        );
    }

    /**
     * mapRow — Converts one database row into a StockRow DTO.
     *
     * WHAT HAPPENS HERE:
     * When JdbcTemplate reads each row from the query results,
     * it gives us a ResultSet — think of it like a cursor pointing at one row.
     * We call rs.getString("ticker"), rs.getBigDecimal("price"), etc.
     * to read each column and put it into our StockRow object.
     **/
    private StockRow mapRow(ResultSet rs, int rowNum) throws SQLException {
        StockRow row = new StockRow();

        // If the column is NULL in the database, getString returns null
        row.setTicker(rs.getString("ticker"));
        row.setCompanyName(rs.getString("company_name"));
        row.setSector(rs.getString("sector"));
        row.setIndustry(rs.getString("industry"));

        // rs.getBigDecimal("price") reads a NUMERIC column as BigDecimal
        // Returns null if the database value is NULL
        row.setMarketCap(rs.getBigDecimal("market_cap"));
        row.setPrice(rs.getBigDecimal("price"));
        row.setChangePercent(rs.getBigDecimal("change_percent"));

        // rs.getLong("volume") reads a BIGINT column
        // But getLong returns 0 for NULL, not null. So we check wasNull():
        long vol = rs.getLong("volume");
        row.setVolume(rs.wasNull() ? null : vol);

        // Fundamentals
        row.setPeRatio(rs.getBigDecimal("pe_ratio"));
        row.setEps(rs.getBigDecimal("eps"));
        row.setDividendYield(rs.getBigDecimal("dividend_yield"));
        row.setDebtToEquity(rs.getBigDecimal("debt_to_equity"));
        row.setRoe(rs.getBigDecimal("roe"));
        row.setPriceToBook(rs.getBigDecimal("price_to_book"));

        // Technicals
        row.setSma50(rs.getBigDecimal("sma_50"));
        row.setSma200(rs.getBigDecimal("sma_200"));
        row.setRsi14(rs.getBigDecimal("rsi_14"));
        row.setMacd(rs.getBigDecimal("macd"));

        return row;
    }
}


