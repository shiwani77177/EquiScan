--  V2: Materialized View for Stock Screening
--  Database: PostgreSQL 16
--
--  WHY THIS EXISTS:

--  The screener needs data from ALL 4 tables for every query:
--    "Show me Technology stocks with P/E < 20 and RSI < 30"
--    needs: stocks (sector) + fundamentals (P/E) + indicators (RSI)
--
--  Without this view, every screener query would:
--    JOIN stocks + latest daily_prices + latest fundamentals + latest indicators
--    = 4 table joins, each needing "find the most recent row" subqueries
--    = slow and complex SQL every single time
--
--  With this materialized view:
--    One flat table with one row per stock, all data pre-joined.
--    The screener just does: SELECT * FROM stock_screening_view WHERE sector = 'Technology'
--    = fast, simple, and easy to index
--
--  "Materialized" means the result is PHYSICALLY STORED on disk.
--    Regular view   = re-runs the JOIN query every time you SELECT from it
--    Materialized   = stores the result like a real table, only updates when you REFRESH
--
--  We REFRESH it once a day after the ingestion job pulls new data.


CREATE MATERIALIZED VIEW stock_screening_view AS
SELECT
    -- ── From stocks table (the "who") ─────────────────────
    s.ticker,
    s.company_name,
    s.sector,
    s.industry,
    s.exchange,
    s.market_cap,

    -- ── From daily_prices (latest day's price data) ───────
    dp.close            AS price,
    dp.volume,
    dp.open             AS day_open,
    dp.high             AS day_high,
    dp.low              AS day_low,

    -- Calculate daily change percentage
    -- Formula: ((today's close - yesterday's close) / yesterday's close) × 100
    -- NULLIF prevents division by zero if prev_close is 0
    ROUND(
        ((dp.close - dp.prev_close) / NULLIF(dp.prev_close, 0)) * 100,
        2
    ) AS change_percent,

    -- ── From fundamentals (latest quarter's financial data) ──
    f.pe_ratio,
    f.eps,
    f.revenue,
    f.net_income,
    f.dividend_yield,
    f.debt_to_equity,
    f.roe,
    f.price_to_book,
    f.free_cash_flow,

    -- ── From technical_indicators (latest day's technicals) ──
    ti.sma_50,
    ti.sma_200,
    ti.rsi_14,
    ti.macd,
    ti.macd_signal,
    ti.bollinger_upper,
    ti.bollinger_lower

FROM stocks s

-- ── JOIN latest price ─────────────────────────────────────
-- LATERAL JOIN = "for each stock, run this subquery"
-- It finds the most recent price row and also grabs the previous day's close
-- for calculating change_percent
LEFT JOIN LATERAL (
    SELECT
        dp_inner.close,
        dp_inner.open,
        dp_inner.high,
        dp_inner.low,
        dp_inner.volume,
        LAG(dp_inner.close) OVER (ORDER BY dp_inner.date) AS prev_close
    FROM daily_prices dp_inner
    WHERE dp_inner.ticker = s.ticker
    ORDER BY dp_inner.date DESC
    LIMIT 1
) dp ON true

-- ── JOIN latest fundamentals ──────────────────────────────
-- Gets the most recent quarterly report for each stock
LEFT JOIN LATERAL (
    SELECT
        f_inner.pe_ratio,
        f_inner.eps,
        f_inner.revenue,
        f_inner.net_income,
        f_inner.dividend_yield,
        f_inner.debt_to_equity,
        f_inner.roe,
        f_inner.price_to_book,
        f_inner.free_cash_flow
    FROM fundamentals f_inner
    WHERE f_inner.ticker = s.ticker
    ORDER BY f_inner.report_date DESC
    LIMIT 1
) f ON true

-- ── JOIN latest technical indicators ──────────────────────
-- Gets the most recent day's calculated indicators
LEFT JOIN LATERAL (
    SELECT
        ti_inner.sma_50,
        ti_inner.sma_200,
        ti_inner.rsi_14,
        ti_inner.macd,
        ti_inner.macd_signal,
        ti_inner.bollinger_upper,
        ti_inner.bollinger_lower
    FROM technical_indicators ti_inner
    WHERE ti_inner.ticker = s.ticker
    ORDER BY ti_inner.date DESC
    LIMIT 1
) ti ON true;


--  INDEXES ON THE MATERIALIZED VIEW
--
--  These are CRITICAL for screening performance.
--  Without them, every filter scans all rows.
--  With them, PostgreSQL jumps straight to matching rows.

-- Unique index on ticker (required for REFRESH CONCURRENTLY)
-- CONCURRENTLY means the view stays readable during refresh — no downtime
CREATE UNIQUE INDEX idx_screening_ticker
    ON stock_screening_view (ticker);

-- Single column indexes for individual filters
CREATE INDEX idx_screening_sector
    ON stock_screening_view (sector);

CREATE INDEX idx_screening_market_cap
    ON stock_screening_view (market_cap);

CREATE INDEX idx_screening_pe_ratio
    ON stock_screening_view (pe_ratio);

CREATE INDEX idx_screening_rsi
    ON stock_screening_view (rsi_14);

CREATE INDEX idx_screening_dividend_yield
    ON stock_screening_view (dividend_yield);

CREATE INDEX idx_screening_volume
    ON stock_screening_view (volume);

CREATE INDEX idx_screening_price
    ON stock_screening_view (price);

-- Composite indexes for common filter combinations
-- "Technology stocks with market cap over 1B" — very common query
CREATE INDEX idx_screening_sector_mcap
    ON stock_screening_view (sector, market_cap);

-- "Stocks with P/E between 5-25 and dividend yield over 2%" — value investing
CREATE INDEX idx_screening_pe_dividend
    ON stock_screening_view (pe_ratio, dividend_yield);

-- "Stocks where SMA 50 > SMA 200" — golden cross screening
CREATE INDEX idx_screening_sma_crossover
    ON stock_screening_view (sma_50, sma_200);


--  HELPER FUNCTION: Refresh the materialized view
--
--  Call this after every data ingestion run.
--  CONCURRENTLY allows reads while refreshing (no downtime).
--  Requires the unique index on ticker (created above).
--
--  Usage from Spring Boot:
--    jdbcTemplate.execute("SELECT refresh_screening_view()");

CREATE OR REPLACE FUNCTION refresh_screening_view()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY stock_screening_view;
END;
$$ LANGUAGE plpgsql;

