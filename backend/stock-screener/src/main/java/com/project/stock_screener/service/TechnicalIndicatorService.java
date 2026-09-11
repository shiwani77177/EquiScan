package com.project.stock_screener.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * TechnicalIndicatorService — Computes technical analysis indicators from price data.
 * 
 * WE COMPUTE 4 INDICATORS:
 *
 * 1. SMA-50  (Simple Moving Average, 50 days)
 *    = Average closing price of the last 50 trading days
 * 
 * 2. SMA-200 (Simple Moving Average, 200 days)
 *    = Average closing price of the last 200 trading days
 *
 * 3. RSI-14  (Relative Strength Index, 14 days)
 *    = Measures if a stock is overbought or oversold
 *    = Below 30 → oversold (might go up)
 *    = Above 70 → overbought (might go down)
 *
 * 4. MACD    (Moving Average Convergence Divergence)
 *    = Shows momentum direction and strength
 *    = Positive → bullish, Negative → bearish
*/
@Service
public class TechnicalIndicatorService {

    private static final Logger log = LoggerFactory.getLogger(TechnicalIndicatorService.class);

    // JdbcTemplate - It handles connection management, prepared statements, and result mapping
    private final JdbcTemplate jdbc;

    // Constructor injection — Spring passes in the JdbcTemplate automatically
    public TechnicalIndicatorService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /* computeAndStore — Computes all indicators for a ticker and saves to DB. */
    public void computeAndStore(String ticker) {
        // 1. Fetch closing prices from the database, newest first
        // Need at least 200 prices for SMA-200
        List<BigDecimal> closes = jdbc.queryForList(
                "SELECT close FROM daily_prices WHERE ticker = ? ORDER BY date DESC LIMIT 200",
                BigDecimal.class,
                ticker
        );

        // Need at least 50 prices for SMA-50
        if (closes.size() < 50) {
            log.warn("Not enough price history for {} ({} days, need 50+). Skipping indicators.",
                    ticker, closes.size());
            return;
        }

        // 2. Compute each indicator
        BigDecimal sma50 = computeSMA(closes, 50);
        BigDecimal sma200 = closes.size() >= 200 ? computeSMA(closes, 200) : null;
        BigDecimal rsi14 = closes.size() >= 15 ? computeRSI(closes, 14) : null;
        BigDecimal macd = closes.size() >= 26 ? computeMACD(closes) : null;
        BigDecimal macdSignal = closes.size() >= 35 ? computeMACDSignal(closes) : null;

        // 3. Get the date of the most recent price (for the primary key)
        LocalDate latestDate = jdbc.queryForObject(
                "SELECT MAX(date) FROM daily_prices WHERE ticker = ?",
                LocalDate.class,
                ticker
        );

        // 4. Upsert into technical_indicators
        //    INSERT if 
        jdbc.update("""
            INSERT INTO technical_indicators 
                (ticker, date, sma_50, sma_200, rsi_14, macd, macd_signal)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (ticker, date) DO UPDATE SET
                sma_50 = EXCLUDED.sma_50,
                sma_200 = EXCLUDED.sma_200,
                rsi_14 = EXCLUDED.rsi_14,
                macd = EXCLUDED.macd,
                macd_signal = EXCLUDED.macd_signal
            """,
                ticker, latestDate, sma50, sma200, rsi14, macd, macdSignal
        );

        log.info("Computed indicators for {} — SMA50={}, SMA200={}, RSI={}, MACD={}",
                ticker,
                sma50 != null ? sma50.setScale(2, RoundingMode.HALF_UP) : "N/A",
                sma200 != null ? sma200.setScale(2, RoundingMode.HALF_UP) : "N/A",
                rsi14 != null ? rsi14.setScale(2, RoundingMode.HALF_UP) : "N/A",
                macd != null ? macd.setScale(4, RoundingMode.HALF_UP) : "N/A"
        );
    }

    //  INDICATOR CALCULATIONS

    /**
     * computeSMA — Simple Moving Average
     *
     * FORMULA: SMA = sum of last N closing prices ÷ N
     *
     * EXAMPLE (SMA-5 for simplicity):
     *   Prices: [230, 228, 225, 227, 226]
     *   SMA-5 = (230 + 228 + 225 + 227 + 226) / 5 = 227.20
    */

    private BigDecimal computeSMA(List<BigDecimal> closes, int period) {
        // Take the first 'period' prices and sum them up using stream().reduce()
        BigDecimal sum = closes.stream()
                .limit(period)                       // take only 'period' items
                .reduce(BigDecimal.ZERO, BigDecimal::add);  // add them all together

        // Divide by the period to get the average
        return sum.divide(BigDecimal.valueOf(period), 4, RoundingMode.HALF_UP);
    }

    /**
     * computeRSI — Relative Strength Index
     *
     * FORMULA:
     *   1. Calculate daily price changes
     *   2. Separate into gains (positive changes) and losses (negative changes)
     *   3. Average gain over 14 days / Average loss over 14 days = RS
     *   4. RSI = 100 - (100 / (1 + RS))
     **/
    private BigDecimal computeRSI(List<BigDecimal> closes, int period) {
        double avgGain = 0;
        double avgLoss = 0;

        // Calculate gains and losses for each consecutive day pair
        // closes[0] is newest, closes[1] is the day before, etc.
        for (int i = 0; i < period && i + 1 < closes.size(); i++) {
            double change = closes.get(i).doubleValue() - closes.get(i + 1).doubleValue();
            if (change > 0) {
                avgGain += change;   // Price went up = gain
            } else {
                avgLoss -= change;   // Price went down = loss (make positive)
            }
        }

        // Average over the period
        avgGain /= period;
        avgLoss /= period;

        // Avoid division by zero — if no losses, RSI = 100
        if (avgLoss == 0) {
            return BigDecimal.valueOf(100);
        }

        // RS = average gain / average loss
        double rs = avgGain / avgLoss;

        // RSI formula: 100 - (100 / (1 + RS))
        double rsi = 100.0 - (100.0 / (1.0 + rs));

        return BigDecimal.valueOf(rsi).setScale(4, RoundingMode.HALF_UP);
    }

    /**
     * computeMACD — Moving Average Convergence Divergence
     *
     * FORMULA: MACD = 12-day EMA - 26-day EMA
     *
     * EMA = Exponential Moving Average (gives more weight to recent prices)
     * Unlike SMA which weights all days equally, EMA reacts faster to
     * recent price changes.
     *
     * INTERPRETATION:
     *   MACD > 0 → short-term trend is stronger than long-term → bullish
     *   MACD < 0 → short-term trend is weaker than long-term → bearish
     **/
    private BigDecimal computeMACD(List<BigDecimal> closes) {
        double ema12 = computeEMA(closes, 12);
        double ema26 = computeEMA(closes, 26);
        return BigDecimal.valueOf(ema12 - ema26).setScale(6, RoundingMode.HALF_UP);
    }

    /**
     * computeMACDSignal — The 9-day EMA of the MACD line itself.
     *
     * Used together with MACD:
     *   When MACD crosses ABOVE signal → buy signal
     *   When MACD crosses BELOW signal → sell signal
     *
     * This is a simplified version — we compute MACD for 9 recent windows
     * and average them as an approximation.
     */
    private BigDecimal computeMACDSignal(List<BigDecimal> closes) {
        // Compute MACD for the 9 most recent points as an approximation
        double sum = 0;
        int count = 0;

        for (int offset = 0; offset < 9 && offset + 26 < closes.size(); offset++) {
            List<BigDecimal> subList = closes.subList(offset, closes.size());
            if (subList.size() >= 26) {
                double ema12 = computeEMA(subList, 12);
                double ema26 = computeEMA(subList, 26);
                sum += (ema12 - ema26);
                count++;
            }
        }

        if (count == 0) return null;
        return BigDecimal.valueOf(sum / count).setScale(6, RoundingMode.HALF_UP);
    }

    /* computeEMA — Exponential Moving Average */
    private double computeEMA(List<BigDecimal> closes, int period) {
        if (closes.size() < period) return 0;

        // Multiplier determines how much weight recent prices get
        double multiplier = 2.0 / (period + 1);

        // Start with SMA of the oldest 'period' prices as the seed value
        double ema = 0;
        int start = Math.min(closes.size(), period);
        for (int i = closes.size() - 1; i >= closes.size() - start; i--) {
            ema += closes.get(i).doubleValue();
        }
        ema /= start;

        // Now apply EMA formula going forward (from older to newer)
        for (int i = closes.size() - start - 1; i >= 0; i--) {
            double price = closes.get(i).doubleValue();
            ema = (price - ema) * multiplier + ema;
        }

        return ema;
    }
}

