package com.project.stock_screener.client;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.stock_screener.dto.PriceData;
import com.project.stock_screener.dto.StockData;

/* YahooFinanceClient — Fetches stock data from Yahoo Finance API. */
@Component
public class YahooFinanceClient {

    private static final Logger log = LoggerFactory.getLogger(YahooFinanceClient.class);

    // RestClient for making HTTP requests
    private final RestClient restClient;

    // Jackson for parsing JSON responses
    private final ObjectMapper mapper;

    // Base URL for Yahoo Finance API v8
    private static final String CHART_URL =
            "https://query1.finance.yahoo.com/v8/finance/chart/%s";

    public YahooFinanceClient() {
        // Build RestClient with a User-Agent header
        // Yahoo blocks requests without a proper User-Agent
        this.restClient = RestClient.builder()
                .defaultHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .build();
        this.mapper = new ObjectMapper();
    }

    /* fetchDailyPrices — Gets historical daily OHLCV data. */
    public List<PriceData> fetchDailyPrices(String ticker, String range) {
        List<PriceData> prices = new ArrayList<>();

        try {
            // Build URL: https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=6mo
            String url = String.format(CHART_URL + "?interval=1d&range=%s", ticker, range);

            log.info("Fetching Yahoo Finance prices for {} (range: {})", ticker, range);

            // Make the HTTP GET request
            String response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);

            // Parse JSON
            JsonNode root = mapper.readTree(response);

            // Navigate to the result object
            // chart → result → [0] (first and only result)
            JsonNode chartResult = root.path("chart").path("result");
            if (chartResult.isMissingNode() || chartResult.isEmpty()) {
                log.warn("No chart data returned from Yahoo Finance for {}", ticker);
                return prices;
            }

            JsonNode result = chartResult.get(0);

            // Get the timestamp array
            JsonNode timestamps = result.path("timestamp");
            if (timestamps.isMissingNode() || timestamps.isEmpty()) {
                log.warn("No timestamps in Yahoo Finance response for {}", ticker);
                return prices;
            }

            // Get the OHLCV arrays from indicators.quote[0]
            JsonNode quote = result.path("indicators").path("quote").get(0);
            JsonNode opens = quote.path("open");
            JsonNode highs = quote.path("high");
            JsonNode lows = quote.path("low");
            JsonNode closes = quote.path("close");
            JsonNode volumes = quote.path("volume");

            // Loop through each day's data
            for (int i = 0; i < timestamps.size(); i++) {
                // Convert Unix timestamp (seconds) to LocalDate
                // Timestamps are in UTC, convert to New York time zone
                long epochSeconds = timestamps.get(i).asLong();
                LocalDate date = Instant.ofEpochSecond(epochSeconds)
                        .atZone(ZoneId.of("America/New_York"))
                        .toLocalDate();

                // Get OHLCV values for this day
                BigDecimal close = safeDecimal(closes, i);

                // Skip days with null close price (market was closed)
                if (close == null) continue;

                PriceData price = new PriceData();
                price.setTicker(ticker);
                price.setDate(date);
                price.setOpen(safeDecimal(opens, i));
                price.setHigh(safeDecimal(highs, i));
                price.setLow(safeDecimal(lows, i));
                price.setClose(close);
                price.setAdjClose(close);  // Using close as adj_close for simplicity
                price.setVolume(safeLong(volumes, i));

                prices.add(price);
            }

            log.info("✓ Fetched {} days of price data for {} from Yahoo Finance", prices.size(), ticker);

        } catch (Exception e) {
            log.error("✗ Yahoo Finance fetch failed for {}: {}", ticker, e.getMessage());
        }

        return prices;
    }


    public StockData fetchQuote(String ticker) {
        try {
            String url = String.format(CHART_URL + "?interval=1d&range=5d", ticker);

            String response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);

            JsonNode root = mapper.readTree(response);
            JsonNode result = root.path("chart").path("result");

            if (result.isMissingNode() || result.isEmpty()) {
                log.warn("No quote data from Yahoo Finance for {}", ticker);
                return null;
            }

            JsonNode meta = result.get(0).path("meta");

            StockData data = new StockData();
            data.setTicker(ticker);

            // Exchange mapping: Yahoo uses short codes
            // NMS = NASDAQ, NYQ = NYSE, etc.
            String exchangeCode = meta.path("exchangeName").asText("");
            data.setExchange(mapExchange(exchangeCode));

            // Currency
            // data.setCurrency(meta.path("currency").asText("USD"));

            log.info("✓ Fetched quote for {} from Yahoo Finance", ticker);
            return data;

        } catch (Exception e) {
            log.error("✗ Yahoo Finance quote failed for {}: {}", ticker, e.getMessage());
            return null;
        }
    }

    //  HELPER METHODS

    /* safeDecimal — Safely reads a decimal value from a JSON array. */
    private BigDecimal safeDecimal(JsonNode array, int index) {
        if (array == null || index >= array.size()) return null;
        JsonNode node = array.get(index);
        if (node == null || node.isNull()) return null;
        return BigDecimal.valueOf(node.asDouble()).setScale(4, RoundingMode.HALF_UP);
    }

    /**
     * safeLong — Safely reads a long value from a JSON array.
     */
    private Long safeLong(JsonNode array, int index) {
        if (array == null || index >= array.size()) return null;
        JsonNode node = array.get(index);
        if (node == null || node.isNull()) return null;
        return node.asLong();
    }

    /**
     * mapExchange — Converts Yahoo's exchange codes to readable names.
     *
     * Yahoo uses: NMS (NASDAQ), NYQ (NYSE), etc.
     * We want: NASDAQ, NYSE, etc.
     */
    private String mapExchange(String code) {
        return switch (code) {
            case "NMS", "NGM", "NCM" -> "NASDAQ";
            case "NYQ" -> "NYSE";
            case "ASE" -> "AMEX";
            case "BTS" -> "BATS";
            default -> code;
        };
    }
}


