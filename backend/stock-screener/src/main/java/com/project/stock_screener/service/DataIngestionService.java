package com.project.stock_screener.service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.project.stock_screener.client.AlphaVantageClient;
import com.project.stock_screener.client.YahooFinanceClient;
import com.project.stock_screener.dto.PriceData;
import com.project.stock_screener.dto.StockData;

/* DataIngestionService — Orchestrates data fetching from multiple sources. */
@Service
public class DataIngestionService {

    private static final Logger log = LoggerFactory.getLogger(DataIngestionService.class);

    private final AlphaVantageClient alphaVantageClient;
    private final YahooFinanceClient yahooClient;
    private final JdbcTemplate jdbc;
    private final TechnicalIndicatorService indicators;

    /**
     * ALL_TICKERS — The complete list of stocks we track.
     *
     * Since Yahoo Finance has no limits, we can track 40+ stocks easily!
     * Mix of sectors for diverse screening:
     *   Technology (10), Healthcare (5), Financial (5),
     *   Consumer (5), Energy (2), Communication (2), Industrial (1)
     */
    private static final List<String> ALL_TICKERS = List.of(
            // ── Technology ────────────────────────────
            "AAPL",     // Apple
            "MSFT",     // Microsoft
            "GOOGL",    // Alphabet (Google)
            "NVDA",     // NVIDIA
            "META",     // Meta (Facebook)
            "AVGO",     // Broadcom
            "ORCL",     // Oracle
            "CRM",      // Salesforce
            "AMD",      // AMD
            "INTC",     // Intel

            // ── Healthcare ────────────────────────────
            "UNH",      // UnitedHealth
            "JNJ",      // Johnson & Johnson
            "PFE",      // Pfizer
            "ABBV",     // AbbVie
            "MRK",      // Merck

            // ── Financial Services ────────────────────
            "JPM",      // JPMorgan
            "V",        // Visa
            "MA",       // Mastercard
            "BAC",      // Bank of America
            "GS",       // Goldman Sachs

            // ── Consumer Cyclical ─────────────────────
            "AMZN",     // Amazon
            "TSLA",     // Tesla
            "NKE",      // Nike
            "MCD",      // McDonald's
            "SBUX",     // Starbucks

            // ── Consumer Defensive ────────────────────
            "WMT",      // Walmart
            "KO",       // Coca-Cola
            "PEP",      // PepsiCo

            // ── Energy ────────────────────────────────
            "XOM",      // Exxon Mobil
            "CVX",      // Chevron

            // ── Communication Services ────────────────
            "DIS",      // Disney
            "NFLX",     // Netflix

            // ── Industrials ───────────────────────────
            "BA",       // Boeing
            "CAT",      // Caterpillar
            "GE",       // GE Aerospace
            "HON"       // Honeywell
    );

    /**
     * Constructor — Spring injects all dependencies.
     */
    public DataIngestionService(AlphaVantageClient alphaVantageClient,
                                YahooFinanceClient yahooClient,
                                JdbcTemplate jdbc,
                                TechnicalIndicatorService indicators) {
        this.alphaVantageClient = alphaVantageClient;
        this.yahooClient = yahooClient;
        this.jdbc = jdbc;
        this.indicators = indicators;
    }

    /**
     * runIngestion — Main entry point. Fetches prices from Yahoo Finance
     * and computes indicators for all tickers.
     *
     * This is the DAILY job — runs every weekday at 7 PM IST (after US market close).
     * Can also be triggered manually via POST /api/v1/admin/ingest
     *
     * FLOW FOR EACH TICKER:
     *   1. Fetch 6 months of daily prices from Yahoo Finance
     *   2. Upsert prices into daily_prices table
     *   3. Compute technical indicators (SMA, RSI, MACD)
     *   4. Upsert indicators into technical_indicators table
     *
     * After all tickers: refresh the materialized view.
     *
     * NO SLEEP NEEDED — Yahoo Finance has no rate limit!
     * 36 tickers × 1 call each = ~30 seconds total.
     */
    @Scheduled(cron = "0 0 19 * * MON-FRI", zone = "Asia/Kolkata")
    public void runIngestion() {
        log.info("═══════════════════════════════════════════════════");
        log.info("  Starting YAHOO FINANCE ingestion for {} tickers", ALL_TICKERS.size());
        log.info("═══════════════════════════════════════════════════");

        int successCount = 0;
        int failCount = 0;

        for (String ticker : ALL_TICKERS) {
            try {
                log.info("────────── Processing {} ──────────", ticker);

                // ── Fetch 6 months of daily prices from Yahoo Finance ──
                List<PriceData> prices = yahooClient.fetchDailyPrices(ticker, "6mo");

                if (!prices.isEmpty()) {
                    // Write prices to database
                    upsertPrices(prices);
                    log.info("  ✓ {} days of price data saved for {}", prices.size(), ticker);

                    // Ensure the stock exists in the stocks table
                    // (with basic info from the price data)
                    ensureStockExists(ticker);

                    // Compute technical indicators from the stored prices
                    indicators.computeAndStore(ticker);
                    log.info("  ✓ Technical indicators computed for {}", ticker);

                    successCount++;
                } else {
                    log.warn("  ✗ No price data for {}", ticker);
                    failCount++;
                }

                // Small delay to be polite to Yahoo's servers (not required, just good practice)
                Thread.sleep(500);

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.error("Ingestion interrupted!");
                break;
            } catch (Exception e) {
                failCount++;
                log.error("  ✗ Failed to process {}: {}", ticker, e.getMessage());
            }
        }

        // ── Refresh the materialized view ─────────────────
        try {
            jdbc.execute("SELECT refresh_screening_view()");
            log.info("✓ Materialized view refreshed");
        } catch (Exception e) {
            log.error("✗ Failed to refresh materialized view: {}", e.getMessage());
        }

        log.info("═══════════════════════════════════════════════════");
        log.info("  Yahoo Finance ingestion complete. Success: {}, Failed: {}", successCount, failCount);
        log.info("═══════════════════════════════════════════════════");
    }

    /**
     * runFundamentalsIngestion — Fetches fundamentals from Alpha Vantage.
     *
     * Run this SEPARATELY and RARELY — fundamentals change quarterly.
     * Uses Alpha Vantage (25 calls/day limit), so we do max 5 tickers per run.
     *
     * Triggered manually: POST /api/v1/admin/ingest-fundamentals
     *
     * @param tickers List of tickers to fetch fundamentals for (max 5)
     */
    public void runFundamentalsIngestion(List<String> tickers) {
        log.info("═══════════════════════════════════════════════════");
        log.info("  Starting ALPHA VANTAGE fundamentals for {} tickers", tickers.size());
        log.info("═══════════════════════════════════════════════════");

        for (String ticker : tickers) {
            try {
                log.info("────────── Fetching fundamentals for {} ──────────", ticker);

                StockData stockData = alphaVantageClient.fetchCompanyOverview(ticker);
                if (stockData != null) {
                    upsertStock(stockData);
                    upsertFundamentals(stockData);
                    log.info("  ✓ Fundamentals saved for {} ({})", ticker, stockData.getCompanyName());
                } else {
                    log.warn("  ✗ No fundamentals for {} (rate limited?)", ticker);
                }

                // 12 second sleep for Alpha Vantage rate limit (5 calls/minute)
                Thread.sleep(12000);

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("  ✗ Failed fundamentals for {}: {}", ticker, e.getMessage());
            }
        }

        log.info("═══════════════════════════════════════════════════");
        log.info("  Alpha Vantage fundamentals complete");
        log.info("═══════════════════════════════════════════════════");
    }

    // ════════════════════════════════════════════════════════
    //  DATABASE WRITE METHODS
    // ════════════════════════════════════════════════════════

    /**
     * ensureStockExists — Creates a basic stock entry if it doesn't exist.
     *
     * Yahoo Finance doesn't give us sector/industry info in the chart endpoint.
     * So we insert a basic row with just the ticker. The full company info
     * comes later when runFundamentalsIngestion is called with Alpha Vantage.
     *
     * ON CONFLICT DO NOTHING = if the stock already exists with full info,
     * don't overwrite it with this basic entry.
     */
    private void ensureStockExists(String ticker) {
        jdbc.update("""
            INSERT INTO stocks (ticker, company_name, sector, exchange, country)
            VALUES (?, ?, 'UNKNOWN', 'UNKNOWN', 'USA')
            ON CONFLICT (ticker) DO NOTHING
            """,
                ticker, ticker  // Use ticker as company_name placeholder
        );
    }

    /**
     * upsertStock — Insert or update the stocks table with full company info.
     * Called by runFundamentalsIngestion (Alpha Vantage data).
     */
    private void upsertStock(StockData data) {
        jdbc.update("""
            INSERT INTO stocks (ticker, company_name, sector, industry, exchange, market_cap, country, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (ticker) DO UPDATE SET
                company_name = EXCLUDED.company_name,
                sector       = EXCLUDED.sector,
                industry     = EXCLUDED.industry,
                exchange     = EXCLUDED.exchange,
                market_cap   = EXCLUDED.market_cap,
                country      = EXCLUDED.country,
                updated_at   = CURRENT_TIMESTAMP
            """,
                data.getTicker(), data.getCompanyName(), data.getSector(),
                data.getIndustry(), data.getExchange(), data.getMarketCap(),
                data.getCountry()
        );
    }

    /**
     * upsertFundamentals — Insert or update the fundamentals table.
     * Called by runFundamentalsIngestion (Alpha Vantage data).
     */
    private void upsertFundamentals(StockData data) {
        jdbc.update("""
            INSERT INTO fundamentals
                (ticker, report_date, pe_ratio, eps, revenue, net_income,
                 dividend_yield, debt_to_equity, roe, price_to_book, free_cash_flow)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (ticker, report_date) DO UPDATE SET
                pe_ratio       = EXCLUDED.pe_ratio,
                eps            = EXCLUDED.eps,
                revenue        = EXCLUDED.revenue,
                net_income     = EXCLUDED.net_income,
                dividend_yield = EXCLUDED.dividend_yield,
                debt_to_equity = EXCLUDED.debt_to_equity,
                roe            = EXCLUDED.roe,
                price_to_book  = EXCLUDED.price_to_book,
                free_cash_flow = EXCLUDED.free_cash_flow
            """,
                data.getTicker(), data.getReportDate(), data.getPeRatio(),
                data.getEps(), data.getRevenue(), data.getNetIncome(),
                data.getDividendYield(), data.getDebtToEquity(), data.getRoe(),
                data.getPriceToBook(), data.getFreeCashFlow()
        );
    }

    /**
     * upsertPrices — Batch insert/update daily prices.
     * Called by runIngestion (Yahoo Finance data).
     */
    private void upsertPrices(List<PriceData> prices) {
        String sql = """
            INSERT INTO daily_prices (ticker, date, open, high, low, close, adj_close, volume)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (ticker, date) DO UPDATE SET
                open      = EXCLUDED.open,
                high      = EXCLUDED.high,
                low       = EXCLUDED.low,
                close     = EXCLUDED.close,
                adj_close = EXCLUDED.adj_close,
                volume    = EXCLUDED.volume
            """;

        jdbc.batchUpdate(sql,
                prices.stream()
                        .map(p -> new Object[]{
                                p.getTicker(), p.getDate(),
                                p.getOpen(), p.getHigh(), p.getLow(),
                                p.getClose(), p.getAdjClose(), p.getVolume()
                        })
                        .toList()
        );
    }

    /**
     * getAllTickers — Returns the full ticker list.
     * Used by the controller to show which tickers are tracked.
     */
    public List<String> getAllTickers() {
        return ALL_TICKERS;
    }
}


