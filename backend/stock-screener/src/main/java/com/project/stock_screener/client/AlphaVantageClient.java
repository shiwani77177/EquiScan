package com.project.stock_screener.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.stock_screener.config.AlphaVantageConfig;
import com.project.stock_screener.dto.PriceData;
import com.project.stock_screener.dto.StockData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/* AlphaVantageClient — Talks to the Alpha Vantage REST API.
 
  WHAT THIS CLASS DOES:
  1. Builds HTTP URLs with your API key
  2. Sends GET requests to Alpha Vantage
  3. Parses the JSON response into our Java DTOs (StockData, PriceData) */

@Component
public class AlphaVantageClient {

    private static final Logger log = LoggerFactory.getLogger(AlphaVantageClient.class);

    private final RestClient restClient;

    private final ObjectMapper objectMapper;

    private final AlphaVantageConfig config;

    public AlphaVantageClient(AlphaVantageConfig config) {
        this.config = config;
        this.restClient = RestClient.create();
        this.objectMapper = new ObjectMapper();
    }

    /* fetchCompanyOverview — Gets company info + fundamentals for one ticker. */

    public StockData fetchCompanyOverview(String ticker) {
        try {
            String url = String.format("%s?function=OVERVIEW&symbol=%s&apikey=%s",
                    config.getBaseUrl(), ticker, config.getApiKey());

            log.info("Fetching company overview for {}", ticker);

            String response = restClient.get()
                    .uri(url)                   // the URL to call
                    .retrieve()                 // execute the request
                    .body(String.class);        // get response body as String

            JsonNode root = objectMapper.readTree(response);

            if (root.has("Note") || root.has("Error Message") || !root.has("Symbol")) {
                log.warn("No data returned for {}. Rate limited or invalid ticker.", ticker);
                return null;
            }

            StockData data = new StockData();

            // Basic company info
            data.setTicker(getTextSafe(root, "Symbol"));                    // "AAPL"
            data.setCompanyName(getTextSafe(root, "Name"));                 // "Apple Inc."
            data.setSector(getTextSafe(root, "Sector"));                    // "Technology"
            data.setIndustry(getTextSafe(root, "Industry"));                // "Consumer Electronics"
            data.setExchange(getTextSafe(root, "Exchange"));                // "NASDAQ"
            data.setCountry(getTextSafe(root, "Country"));                  // "USA"
            data.setMarketCap(getLongSafe(root, "MarketCapitalization"));    // 3000000000000

            // Fundamental data
            data.setPeRatio(getDecimalSafe(root, "PERatio"));               // 33.50
            data.setEps(getDecimalSafe(root, "EPS"));                       // 6.84
            data.setDividendYield(getDecimalSafe(root, "DividendYield"));   // 0.0055
            data.setDebtToEquity(getDecimalSafe(root, "DebtToEquity"));     // 1.87 (not always present)
            data.setRoe(getDecimalSafe(root, "ReturnOnEquityTTM"));         // 1.6073
            data.setPriceToBook(getDecimalSafe(root, "PriceToBookRatio"));  // 51.20
            data.setRevenue(getDecimalSafe(root, "RevenueTTM"));            // 94500000000
            data.setNetIncome(getDecimalSafe(root, "NetIncomeTTM"));        // 24120000000

            // Use today's date as the report date
            data.setReportDate(LocalDate.now());

            log.info("Successfully fetched overview for {} ({})", ticker, data.getCompanyName());
            return data;

        } catch (Exception e) {
            // If anything goes wrong (network error, bad JSON, etc.), log it and return null
            log.error("Failed to fetch overview for {}: {}", ticker, e.getMessage());
            return null;
        }
    }

    /* fetchDailyPrices — Gets the last 100 days of OHLCV price data. */
    public List<PriceData> fetchDailyPrices(String ticker) {
        List<PriceData> prices = new ArrayList<>();

        try {
            //    "compact" = last 100 trading days
            //    "full" = 20+ years of data
            String url = String.format(
                    "%s?function=TIME_SERIES_DAILY&symbol=%s&outputsize=compact&apikey=%s",
                    config.getBaseUrl(), ticker, config.getApiKey());

            log.info("Fetching daily prices for {}", ticker);

            String response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);

            if (root.has("Note") || root.has("Error Message")) {
                log.warn("No price data returned for {}. Rate limited or invalid ticker.", ticker);
                return prices;
            }

            JsonNode timeSeries = root.get("Time Series (Daily)");
            if (timeSeries == null) {
                log.warn("No 'Time Series (Daily)' found in response for {}", ticker);
                return prices;
            }

            Iterator<Map.Entry<String, JsonNode>> fields = timeSeries.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();

                // entry.getKey()   = "2026-09-09" (the date string)
                // entry.getValue() = { "1. open": "228.5", "2. high": "231.2", ... }
                String dateStr = entry.getKey();
                JsonNode dayData = entry.getValue();

                PriceData price = new PriceData();
                price.setTicker(ticker);
                price.setDate(LocalDate.parse(dateStr));     // "2026-09-09" → LocalDate

                // Alpha Vantage uses numbered prefixes
                price.setOpen(getDecimalSafe(dayData, "1. open"));               // 228.5000
                price.setHigh(getDecimalSafe(dayData, "2. high"));               // 231.2000
                price.setLow(getDecimalSafe(dayData, "3. low"));                 // 227.8000
                price.setClose(getDecimalSafe(dayData, "4. close"));             // 230.1000
                price.setAdjClose(getDecimalSafe(dayData, "4. close"));          // Same as close for now
                price.setVolume(getLongSafe(dayData, "5. volume"));              // 52340000

                prices.add(price);
            }

            log.info("Fetched {} days of price data for {}", prices.size(), ticker);

        } catch (Exception e) {
            log.error("Failed to fetch prices for {}: {}", ticker, e.getMessage());
        }

        return prices;
    }

    //  HELPER METHODS — Safe JSON parsing
    private String getTextSafe(JsonNode node, String field) {
        // node.has(field) checks if the key exists in the JSON
        if (node.has(field) && !node.get(field).isNull()) {
            String value = node.get(field).asText();
            // Alpha Vantage returns "None" or "-" for missing values
            if ("None".equals(value) || "-".equals(value) || value.isEmpty()) {
                return null;
            }
            return value;
        }
        return null;
    }

    /* Safely get a BigDecimal from a JSON node. */
    private BigDecimal getDecimalSafe(JsonNode node, String field) {
        String text = getTextSafe(node, field);
        if (text == null) return null;
        try {
            return new BigDecimal(text);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Long getLongSafe(JsonNode node, String field) {
        String text = getTextSafe(node, field);
        if (text == null) return null;
        try {
            // Some values come as "52340000.0" — parse as double first, then convert
            return (long) Double.parseDouble(text);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}

