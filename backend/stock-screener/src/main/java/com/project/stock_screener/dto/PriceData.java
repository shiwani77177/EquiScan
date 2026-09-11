package com.project.stock_screener.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/* PriceData — Holds one day of OHLCV price data for one stock. */
public class PriceData {

    private String ticker;          // Which stock: "AAPL"
    private LocalDate date;         // Which day: 2026-09-09
    private BigDecimal open;        // Opening price
    private BigDecimal high;        // Day's highest price
    private BigDecimal low;         // Day's lowest price
    private BigDecimal close;       // Closing price (most important)
    private BigDecimal adjClose;    // Adjusted close (accounts for stock splits)
    private Long volume;            // Number of shares traded


    public PriceData() {
    }

    // Getters and Setters 

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public BigDecimal getOpen() { return open; }
    public void setOpen(BigDecimal open) { this.open = open; }

    public BigDecimal getHigh() { return high; }
    public void setHigh(BigDecimal high) { this.high = high; }

    public BigDecimal getLow() { return low; }
    public void setLow(BigDecimal low) { this.low = low; }

    public BigDecimal getClose() { return close; }
    public void setClose(BigDecimal close) { this.close = close; }

    public BigDecimal getAdjClose() { return adjClose; }
    public void setAdjClose(BigDecimal adjClose) { this.adjClose = adjClose; }

    public Long getVolume() { return volume; }
    public void setVolume(Long volume) { this.volume = volume; }
}

