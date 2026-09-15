package com.project.stock_screener.controller;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.project.stock_screener.dto.StockRow;

/* StockController — Endpoints for individual stock detail and price history. */
@RestController
@RequestMapping("/api/v1/stocks")
@CrossOrigin
public class StockController {

    private static final Logger log = LoggerFactory.getLogger(StockController.class);
    private final JdbcTemplate jdbc;

    public StockController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * GET /api/v1/stocks/{ticker} — Returns full detail for one stock.
     * 
     * Example:-
     *   /api/v1/stocks/AAPL → ticker = "AAPL"
     *   /api/v1/stocks/MSFT → ticker = "MSFT"
     */
    @GetMapping("/{ticker}")
    public ResponseEntity<?> getStockDetail(@PathVariable String ticker) {
        log.info("Fetching detail for {}", ticker);

        // Query the materialized view for this specific ticker
        List<StockRow> results = jdbc.query(
                "SELECT * FROM stock_screening_view WHERE ticker = ?",
                this::mapToStockRow,
                ticker.toUpperCase()  // Ensure uppercase: "aapl" → "AAPL"
        );

        // If ticker not found, return 404 bad request
        if (results.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(results.get(0));
    }

    /**
     * GET /api/v1/stocks/{ticker}/prices — Returns price history for charting.
     * 
     * Example:-
     *   /api/v1/stocks/AAPL/prices?months=3 → last 3 months
     *   /api/v1/stocks/AAPL/prices?months=12 → last 12 months
     *   Default is 3 if not specified
     **/
    @GetMapping("/{ticker}/prices")
    public ResponseEntity<List<Map<String, Object>>> getStockPrices(
            @PathVariable String ticker,
            @RequestParam(defaultValue = "3") int months) {

        log.info("Fetching {} months of prices for {}", months, ticker);

        LocalDate startDate = LocalDate.now().minusMonths(months);

        List<Map<String, Object>> prices = jdbc.queryForList("""
            SELECT 
                dp.date,
                dp.open,
                dp.high,
                dp.low,
                dp.close,
                dp.volume,
                ti.sma_50,
                ti.sma_200
            FROM daily_prices dp
            LEFT JOIN technical_indicators ti 
                ON dp.ticker = ti.ticker AND dp.date = ti.date
            WHERE dp.ticker = ?
              AND dp.date >= ?
            ORDER BY dp.date ASC
            """,
                ticker.toUpperCase(),
                startDate
        );

        return ResponseEntity.ok(prices);
    }

    private StockRow mapToStockRow(ResultSet rs, int rowNum) throws SQLException {
        StockRow row = new StockRow();
        row.setTicker(rs.getString("ticker"));
        row.setCompanyName(rs.getString("company_name"));
        row.setSector(rs.getString("sector"));
        row.setIndustry(rs.getString("industry"));
        row.setMarketCap(rs.getBigDecimal("market_cap"));
        row.setPrice(rs.getBigDecimal("price"));
        row.setChangePercent(rs.getBigDecimal("change_percent"));

        long vol = rs.getLong("volume");
        row.setVolume(rs.wasNull() ? null : vol);

        row.setPeRatio(rs.getBigDecimal("pe_ratio"));
        row.setEps(rs.getBigDecimal("eps"));
        row.setDividendYield(rs.getBigDecimal("dividend_yield"));
        row.setDebtToEquity(rs.getBigDecimal("debt_to_equity"));
        row.setRoe(rs.getBigDecimal("roe"));
        row.setPriceToBook(rs.getBigDecimal("price_to_book"));
        row.setSma50(rs.getBigDecimal("sma_50"));
        row.setSma200(rs.getBigDecimal("sma_200"));
        row.setRsi14(rs.getBigDecimal("rsi_14"));
        row.setMacd(rs.getBigDecimal("macd"));
        return row;
    }
}


