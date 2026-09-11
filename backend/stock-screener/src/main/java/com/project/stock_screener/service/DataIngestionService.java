package com.project.stock_screener.service;

import com.project.stock_screener.client.AlphaVantageClient;
import com.project.stock_screener.dto.PriceData;
import com.project.stock_screener.dto.StockData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

/* DataIngestionService — The orchestrator. Pulls data from Alpha Vantage
 * and writes it into PostgreSQL. */

@Service
public class DataIngestionService {

    private static final Logger log = LoggerFactory.getLogger(DataIngestionService.class);

    // Dependencies
    private final AlphaVantageClient apiClient;         // Fetches from Alpha Vantage
    private final JdbcTemplate jdbc;                     // Writes to PostgreSQL
    private final TechnicalIndicatorService indicators;  // Computes SMA, RSI, MACD


    private static final List<String> SEED_TICKERS = List.of(
            "AAPL",     // Apple
            "MSFT",     // Microsoft
            "GOOGL",    // Alphabet (Google)
            "AMZN",     // Amazon
            "NVDA",     // NVIDIA
            "JPM",      // JPMorgan
            "V",        // Visa
            "JNJ",      // Johnson & Johnson
            "UNH",      // UnitedHealth
            "XOM",      // ExxonMobil
            "WMT",      // Walmart
            "DIS"       // Disney
    );


    public DataIngestionService(AlphaVantageClient apiClient,
                                JdbcTemplate jdbc,
                                TechnicalIndicatorService indicators) {
        this.apiClient = apiClient;
        this.jdbc = jdbc;
        this.indicators = indicators;
    }

    /**
     * runIngestion — The main entry point. Fetches and stores data for all tickers.
     *
     * @Scheduled EXPLAINED:
     *   initialDelay = 10000  → Wait 10 seconds after app starts before first run.
     *                           This gives the database time to be fully ready
     * fixedDelay = 86400000 → Then run every 24 hours */

    @Scheduled(initialDelay = 10000, fixedDelay = 86400000)
    public void runIngestion() {
        log.info("═══════════════════════════════════════════════════");
        log.info("  Starting data ingestion for {} tickers", SEED_TICKERS.size());
        log.info("═══════════════════════════════════════════════════");

        int successCount = 0;
        int failCount = 0;

        for (String ticker : SEED_TICKERS) {
            try {
                log.info("────────── Processing {} ──────────", ticker);

                // Fetch and store company overview
                StockData stockData = apiClient.fetchCompanyOverview(ticker);
                if (stockData != null) {
                    upsertStock(stockData);
                    upsertFundamentals(stockData);
                    log.info("  ✓ Company overview saved for {}", ticker);
                } else {
                    log.warn("  ✗ No overview data for {}", ticker);
                }

                // Sleep 12 seconds between API calls to respect rate limit
                Thread.sleep(12000);

                // Fetch and store daily prices
                List<PriceData> prices = apiClient.fetchDailyPrices(ticker);
                if (!prices.isEmpty()) {
                    upsertPrices(prices);
                    log.info("  ✓ {} days of price data saved for {}", prices.size(), ticker);

                    // Step 3: Compute technical indicators
                    indicators.computeAndStore(ticker);
                    log.info("  ✓ Technical indicators computed for {}", ticker);
                } else {
                    log.warn("  ✗ No price data for {}", ticker);
                }

                successCount++;

                // Sleep again for 12 sec before the next ticker
                Thread.sleep(12000);

            } catch (InterruptedException e) {
                // Thread.sleep can be interrupted
                Thread.currentThread().interrupt();
                log.error("Ingestion interrupted!");
                break;
            } catch (Exception e) {
                // If one ticker fails, log it and continue with the next
                failCount++;
                log.error("  ✗ Failed to process {}: {}", ticker, e.getMessage());
            }
        }

        // Step 4: Refresh the materialized view
        try {
            jdbc.execute("SELECT refresh_screening_view()");
            log.info("✓ Materialized view refreshed");
        } catch (Exception e) {
            log.error("✗ Failed to refresh materialized view: {}", e.getMessage());
        }

        log.info("═══════════════════════════════════════════════════");
        log.info("  Ingestion complete. Success: {}, Failed: {}", successCount, failCount);
        log.info("═══════════════════════════════════════════════════");
    }


    //  DATABASE WRITE METHODS

    /* upsertStock — Insert or update a row in the 'stocks' table. */
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
                data.getTicker(),
                data.getCompanyName(),
                data.getSector(),
                data.getIndustry(),
                data.getExchange(),
                data.getMarketCap(),
                data.getCountry()
        );
    }

    /* upsertFundamentals — Insert or update a row in the 'fundamentals' table. */
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
                data.getTicker(),
                data.getReportDate(),
                data.getPeRatio(),
                data.getEps(),
                data.getRevenue(),
                data.getNetIncome(),
                data.getDividendYield(),
                data.getDebtToEquity(),
                data.getRoe(),
                data.getPriceToBook(),
                data.getFreeCashFlow()
        );
    }

    /* upsertPrices — Insert or update rows in the 'daily_prices' table. */
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
                                p.getTicker(),
                                p.getDate(),
                                p.getOpen(),
                                p.getHigh(),
                                p.getLow(),
                                p.getClose(),
                                p.getAdjClose(),
                                p.getVolume()
                        })
                        .toList()
        );
    }
}


