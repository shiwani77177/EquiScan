package com.project.stock_screener.dto;

import java.math.BigDecimal;

/**
 * StockRow — Represents ONE row in the screening results table.
 *
 * WHAT THE FRONTEND RECEIVES:
 * When the screener finds matching stocks, each stock becomes a StockRow.
*/

public class StockRow {

    // Company info (from stocks table)
    private String ticker;          // "AAPL"
    private String companyName;     // "Apple Inc."
    private String sector;          // "Technology"
    private String industry;        // "Consumer Electronics"

    // Price data (from daily_prices)
    private BigDecimal marketCap;       // 3000000000000
    private BigDecimal price;           // 230.10
    private BigDecimal changePercent;   // 1.25 (means +1.25%)
    private Long volume;                // 52340000

    // Fundamentals (from fundamentals)
    private BigDecimal peRatio;         // 33.50
    private BigDecimal eps;             // 6.84
    private BigDecimal dividendYield;   // 0.55
    private BigDecimal debtToEquity;    // 1.87
    private BigDecimal roe;             // 160.73
    private BigDecimal priceToBook;     // 51.20

    // Technicals (from technical_indicators)
    private BigDecimal sma50;           // 225.30
    private BigDecimal sma200;          // 218.45
    private BigDecimal rsi14;           // 42.50
    private BigDecimal macd;            // 1.2340

    // Constructor
    public StockRow() {
    }

    // ── Getters and Setters ───────────────────────────────
    // Each getter/setter pair lets other code read/write one field.
    // Jackson uses these to convert StockRow → JSON for the API response.

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public String getSector() { return sector; }
    public void setSector(String sector) { this.sector = sector; }

    public String getIndustry() { return industry; }
    public void setIndustry(String industry) { this.industry = industry; }

    public BigDecimal getMarketCap() { return marketCap; }
    public void setMarketCap(BigDecimal marketCap) { this.marketCap = marketCap; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getChangePercent() { return changePercent; }
    public void setChangePercent(BigDecimal changePercent) { this.changePercent = changePercent; }

    public Long getVolume() { return volume; }
    public void setVolume(Long volume) { this.volume = volume; }

    public BigDecimal getPeRatio() { return peRatio; }
    public void setPeRatio(BigDecimal peRatio) { this.peRatio = peRatio; }

    public BigDecimal getEps() { return eps; }
    public void setEps(BigDecimal eps) { this.eps = eps; }

    public BigDecimal getDividendYield() { return dividendYield; }
    public void setDividendYield(BigDecimal dividendYield) { this.dividendYield = dividendYield; }

    public BigDecimal getDebtToEquity() { return debtToEquity; }
    public void setDebtToEquity(BigDecimal debtToEquity) { this.debtToEquity = debtToEquity; }

    public BigDecimal getRoe() { return roe; }
    public void setRoe(BigDecimal roe) { this.roe = roe; }

    public BigDecimal getPriceToBook() { return priceToBook; }
    public void setPriceToBook(BigDecimal priceToBook) { this.priceToBook = priceToBook; }

    public BigDecimal getSma50() { return sma50; }
    public void setSma50(BigDecimal sma50) { this.sma50 = sma50; }

    public BigDecimal getSma200() { return sma200; }
    public void setSma200(BigDecimal sma200) { this.sma200 = sma200; }

    public BigDecimal getRsi14() { return rsi14; }
    public void setRsi14(BigDecimal rsi14) { this.rsi14 = rsi14; }

    public BigDecimal getMacd() { return macd; }
    public void setMacd(BigDecimal macd) { this.macd = macd; }
}



