-- Recreate the materialized view after ticker column type change
-- The view needs to be dropped and recreated because it caches column types

DROP MATERIALIZED VIEW IF EXISTS stock_screening_view;

CREATE MATERIALIZED VIEW stock_screening_view AS
SELECT
    s.ticker, s.company_name, s.sector, s.industry, s.exchange, s.market_cap,
    dp.close AS price, dp.volume, dp.open AS day_open, dp.high AS day_high, dp.low AS day_low,
    ROUND(((dp.close - dp.prev_close) / NULLIF(dp.prev_close, 0)) * 100, 2) AS change_percent,
    f.pe_ratio, f.eps, f.revenue, f.net_income, f.dividend_yield,
    f.debt_to_equity, f.roe, f.price_to_book, f.free_cash_flow,
    ti.sma_50, ti.sma_200, ti.rsi_14, ti.macd, ti.macd_signal,
    ti.bollinger_upper, ti.bollinger_lower
FROM stocks s
LEFT JOIN LATERAL (
    SELECT dp_inner.close, dp_inner.open, dp_inner.high, dp_inner.low, dp_inner.volume,
           LAG(dp_inner.close) OVER (ORDER BY dp_inner.date) AS prev_close
    FROM daily_prices dp_inner WHERE dp_inner.ticker = s.ticker
    ORDER BY dp_inner.date DESC LIMIT 1
) dp ON true
LEFT JOIN LATERAL (
    SELECT f_inner.pe_ratio, f_inner.eps, f_inner.revenue, f_inner.net_income,
           f_inner.dividend_yield, f_inner.debt_to_equity, f_inner.roe,
           f_inner.price_to_book, f_inner.free_cash_flow
    FROM fundamentals f_inner WHERE f_inner.ticker = s.ticker
    ORDER BY f_inner.report_date DESC LIMIT 1
) f ON true
LEFT JOIN LATERAL (
    SELECT ti_inner.sma_50, ti_inner.sma_200, ti_inner.rsi_14, ti_inner.macd,
           ti_inner.macd_signal, ti_inner.bollinger_upper, ti_inner.bollinger_lower
    FROM technical_indicators ti_inner WHERE ti_inner.ticker = s.ticker
    ORDER BY ti_inner.date DESC LIMIT 1
) ti ON true;

-- Indexes
CREATE UNIQUE INDEX idx_screening_ticker ON stock_screening_view (ticker);
CREATE INDEX idx_screening_sector ON stock_screening_view (sector);
CREATE INDEX idx_screening_market_cap ON stock_screening_view (market_cap);
CREATE INDEX idx_screening_pe_ratio ON stock_screening_view (pe_ratio);
CREATE INDEX idx_screening_rsi ON stock_screening_view (rsi_14);
CREATE INDEX idx_screening_dividend_yield ON stock_screening_view (dividend_yield);
CREATE INDEX idx_screening_volume ON stock_screening_view (volume);
CREATE INDEX idx_screening_price ON stock_screening_view (price);
CREATE INDEX idx_screening_sector_mcap ON stock_screening_view (sector, market_cap);
CREATE INDEX idx_screening_pe_dividend ON stock_screening_view (pe_ratio, dividend_yield);
CREATE INDEX idx_screening_sma_crossover ON stock_screening_view (sma_50, sma_200);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_screening_view()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY stock_screening_view;
END;
$$ LANGUAGE plpgsql;


