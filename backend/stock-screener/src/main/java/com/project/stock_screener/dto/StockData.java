package com.project.stock_screener.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/* StockData — A plain data container for company information. */
public class StockData {

    // ── Basic company info (goes into 'stocks' table) ─────

    private String ticker;          // "AAPL"
    private String companyName;     // "Apple Inc."
    private String sector;          // "Technology"
    private String industry;        // "Consumer Electronics"
    private String exchange;        // "NASDAQ"
    private Long marketCap;         // 3000000000000 (3 trillion)
    private String country;         // "USA"

    // ── Fundamental data (goes into 'fundamentals' table) ──

    private BigDecimal peRatio;         // 33.50
    private BigDecimal eps;             // 6.84
    private BigDecimal dividendYield;   // 0.55 (means 0.55%)
    private BigDecimal debtToEquity;    // 1.87
    private BigDecimal roe;             // 160.73
    private BigDecimal priceToBook;     // 51.20
    private BigDecimal revenue;         // 94500000000
    private BigDecimal netIncome;       // 24120000000
    private BigDecimal freeCashFlow;    // 112000000000

    // We use the current date as the "report_date" for fundamentals
    private LocalDate reportDate;

    // Constructor
    // Empty constructor needed by frameworks and for manual creation
    public StockData() {
    }

    // Getters and Setters for every field

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public String getSector() { return sector; }
    public void setSector(String sector) { this.sector = sector; }

    public String getIndustry() { return industry; }
    public void setIndustry(String industry) { this.industry = industry; }

    public String getExchange() { return exchange; }
    public void setExchange(String exchange) { this.exchange = exchange; }

    public Long getMarketCap() { return marketCap; }
    public void setMarketCap(Long marketCap) { this.marketCap = marketCap; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

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

    public BigDecimal getRevenue() { return revenue; }
    public void setRevenue(BigDecimal revenue) { this.revenue = revenue; }

    public BigDecimal getNetIncome() { return netIncome; }
    public void setNetIncome(BigDecimal netIncome) { this.netIncome = netIncome; }

    public BigDecimal getFreeCashFlow() { return freeCashFlow; }
    public void setFreeCashFlow(BigDecimal freeCashFlow) { this.freeCashFlow = freeCashFlow; }

    public LocalDate getReportDate() { return reportDate; }
    public void setReportDate(LocalDate reportDate) { this.reportDate = reportDate; }
}

