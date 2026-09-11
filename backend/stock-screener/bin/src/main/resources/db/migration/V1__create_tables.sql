--  V1: Core Tables for EquiScan Stock Screener


--  TABLE 1: stocks
--  Purpose: Master list of every company we track.
--           This is the "who" — every other table references
--           a ticker from here.
--
--  One row = one company.
--  Example row:
--    AAPL | Apple Inc. | Technology | Consumer Electronics
--    | NASDAQ | 3000000000000 | US | 1980-12-12

CREATE TABLE stocks (
    -- Primary key: the stock ticker symbol (e.g., AAPL, GOOGL, RELIANCE)
    -- VARCHAR(10) because most tickers are 1-5 chars, Indian ones can be longer
    ticker          VARCHAR(10)     PRIMARY KEY,

    -- Full company name (e.g., "Apple Inc.", "Reliance Industries Ltd")
    company_name    VARCHAR(255)    NOT NULL,

    -- Business sector (e.g., "Technology", "Healthcare", "Energy")
    -- Users filter by this: "show me all Technology stocks"
    sector          VARCHAR(100),

    -- More specific than sector (e.g., "Consumer Electronics", "Drug Manufacturers")
    industry        VARCHAR(150),

    -- Which stock exchange it trades on (e.g., "NASDAQ", "NYSE", "BSE")
    exchange        VARCHAR(20),

    -- Total market value of all shares in USD
    -- BIGINT because large companies exceed 2 billion (INTEGER max is ~2.1B)
    -- Apple = ~3 trillion = 3,000,000,000,000 → needs BIGINT
    market_cap      BIGINT,

    -- Country of headquarters
    country         VARCHAR(50),

    -- When the company first went public
    ipo_date        DATE,

    -- Metadata timestamps
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

-- Index on sector: users frequently filter "show me Technology stocks"
-- Without this, PostgreSQL scans every row checking sector = 'Technology'
-- With this, it jumps straight to matching rows
CREATE INDEX idx_stocks_sector ON stocks (sector);

-- Index on exchange: filter by "show me only NASDAQ stocks"
CREATE INDEX idx_stocks_exchange ON stocks (exchange);

-- Index on market_cap: filter by "market cap > 1 billion"
-- Common screener filter, needs to be fast
CREATE INDEX idx_stocks_market_cap ON stocks (market_cap);

-- Composite index: the most common filter combo
-- "Technology stocks with market cap over 1B" hits both columns at once
CREATE INDEX idx_stocks_sector_market_cap ON stocks (sector, market_cap);


--  TABLE 2: daily_prices
--  Purpose: OHLCV (Open, High, Low, Close, Volume) price data.
--           One row = one stock on one day.
--           This is the raw market data fetched from Alpha Vantage.
--
--  This will be your LARGEST table:
--    30 stocks × 252 trading days/year × 3 years = ~22,680 rows
--    500 stocks × 252 × 5 years = ~630,000 rows
--
--  Example row:
--    AAPL | 2026-09-09 | 228.50 | 231.20 | 227.80 | 230.10
--    | 230.10 | 52340000

CREATE TABLE daily_prices (
    -- Which stock this price belongs to
    ticker          VARCHAR(10)     NOT NULL,

    -- The trading date (no time — markets have one set of OHLCV per day)
    date            DATE            NOT NULL,

    -- Opening price when the market opened that day
    -- NUMERIC(12,4) = up to 12 digits total, 4 after decimal
    -- Handles prices from $0.0001 (penny stocks) to $99,999,999.9999
    open            NUMERIC(12,4),

    -- Highest price reached during the trading day
    high            NUMERIC(12,4),

    -- Lowest price reached during the trading day
    low             NUMERIC(12,4),

    -- Final price when the market closed — THIS is what most people mean by "stock price"
    close           NUMERIC(12,4),

    -- Adjusted close: accounts for splits and dividends
    -- If a stock splits 2:1, historical prices are halved so charts look continuous
    -- This is what you use for accurate historical comparison
    adj_close       NUMERIC(12,4),

    -- Number of shares traded that day
    -- BIGINT because popular stocks can trade billions of shares
    volume          BIGINT,

    -- Composite primary key: one price row per stock per day
    -- This also prevents duplicate data if we accidentally ingest the same day twice
    PRIMARY KEY (ticker, date),

    -- Foreign key: ticker must exist in stocks table
    -- CASCADE on delete: if we remove a stock, remove its prices too
    FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE
);

-- Index for fetching price history for charts: "get AAPL prices for last 3 months"
-- The primary key already covers (ticker, date) but this explicit index
-- with DESC ordering helps the "latest price" queries
CREATE INDEX idx_daily_prices_ticker_date ON daily_prices (ticker, date DESC);

-- Index for volume-based screening: "stocks with volume over 1 million"
CREATE INDEX idx_daily_prices_volume ON daily_prices (volume);


--  TABLE 3: fundamentals
--  Purpose: Quarterly financial data from earnings reports.
--           One row = one stock for one quarter.
--           This is what value investors filter on.
--
--  Updated quarterly (4 times a year per stock).
--  Much smaller than daily_prices.
--
--  Example row:
--    AAPL | 2026-06-30 | 33.50 | 6.84 | 94500000000
--    | 24120000000 | 0.55 | 1.87 | 160.73 | 51.20
--    | 112000000000

CREATE TABLE fundamentals (
    -- Which stock
    ticker          VARCHAR(10)     NOT NULL,

    -- The quarter end date (e.g., 2026-03-31 for Q1 2026)
    report_date     DATE            NOT NULL,

    -- Price-to-Earnings ratio: stock price ÷ earnings per share
    -- Low P/E (under 15) = potentially undervalued ("value stock")
    -- High P/E (over 30) = expensive or high growth expected
    -- NUMERIC(10,4) handles values like 33.5000 or 1234.5678
    pe_ratio        NUMERIC(10,4),

    -- Earnings Per Share: net income ÷ total shares outstanding
    -- How much profit each share earned
    -- Positive = profitable, negative = losing money
    eps             NUMERIC(10,4),

    -- Total revenue (sales) for the quarter in USD
    -- NUMERIC(18,2) because big companies have revenue in billions
    -- Apple Q1 2026: ~$94,500,000,000.00
    revenue         NUMERIC(18,2),

    -- Net income (bottom line profit) for the quarter
    net_income      NUMERIC(18,2),

    -- Dividend Yield: annual dividend ÷ stock price × 100
    -- 2.5 means the stock pays 2.5% of its price as dividends per year
    -- 0 means no dividend (growth stocks like Tesla)
    dividend_yield  NUMERIC(8,4),

    -- Debt-to-Equity ratio: total debt ÷ shareholder equity
    -- Low (under 1) = conservatively financed
    -- High (over 2) = heavily leveraged, riskier
    debt_to_equity  NUMERIC(10,4),

    -- Return on Equity: net income ÷ shareholder equity × 100
    -- Measures how efficiently the company uses investor money
    -- 20+ is excellent, under 10 is weak
    roe             NUMERIC(10,4),

    -- Price-to-Book ratio: stock price ÷ book value per share
    -- Under 1 = stock trades below its accounting value (potentially cheap)
    -- Over 5 = expensive relative to assets
    price_to_book   NUMERIC(10,4),

    -- Free Cash Flow: cash from operations minus capital expenditure
    -- The actual cash a company generates after paying for its business
    -- Positive and growing = healthy, negative = burning cash
    free_cash_flow  NUMERIC(18,2),

    -- One row per stock per quarter
    PRIMARY KEY (ticker, report_date),

    FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE
);

-- Index for getting the latest fundamentals for a stock
CREATE INDEX idx_fundamentals_ticker_date ON fundamentals (ticker, report_date DESC);

-- Index for P/E ratio screening: "stocks with P/E between 5 and 25"
CREATE INDEX idx_fundamentals_pe ON fundamentals (pe_ratio);

-- Index for dividend screening: "stocks with dividend yield over 3%"
CREATE INDEX idx_fundamentals_dividend ON fundamentals (dividend_yield);


--  TABLE 4: technical_indicators
--  Purpose: Precomputed technical analysis values.
--           Calculated from daily_prices during ingestion,
--           stored here so the screener doesn't compute on the fly.
--
--  One row = one stock on one day (same grain as daily_prices).
--  These are what momentum/swing traders filter on.
--
--  Example row:
--    AAPL | 2026-09-09 | 225.30 | 218.45 | 42.50
--    | 1.2340 | 0.9870 | 240.50 | 210.10

CREATE TABLE technical_indicators (
    -- Which stock
    ticker          VARCHAR(10)     NOT NULL,

    -- Which day these indicators are calculated for
    date            DATE            NOT NULL,

    -- Simple Moving Average (50 days)
    -- Average closing price over the last 50 trading days
    -- When price is ABOVE sma_50, the stock is in a short-term uptrend
    -- When price is BELOW sma_50, short-term downtrend
    sma_50          NUMERIC(12,4),

    -- Simple Moving Average (200 days)
    -- Average closing price over the last 200 trading days
    -- The "big picture" trend indicator
    -- GOLDEN CROSS: sma_50 crosses ABOVE sma_200 = bullish signal
    -- DEATH CROSS:  sma_50 crosses BELOW sma_200 = bearish signal
    sma_200         NUMERIC(12,4),

    -- Relative Strength Index (14-day period)
    -- Ranges from 0 to 100
    -- Below 30 = OVERSOLD (potentially cheap, might bounce up)
    -- Above 70 = OVERBOUGHT (potentially expensive, might drop)
    -- Traders use this to find entry/exit points
    rsi_14          NUMERIC(8,4),

    -- Moving Average Convergence Divergence
    -- Calculated as: 12-day EMA minus 26-day EMA
    -- Positive = bullish momentum, Negative = bearish momentum
    -- When MACD crosses above signal line = buy signal
    macd            NUMERIC(12,6),

    -- MACD Signal Line: 9-day EMA of the MACD itself
    -- Used together with macd to generate buy/sell signals
    macd_signal     NUMERIC(12,6),

    -- Bollinger Bands: volatility indicator
    -- Upper band = sma_20 + (2 × standard deviation)
    -- When price hits upper band, stock might be overextended
    bollinger_upper NUMERIC(12,4),

    -- Lower band = sma_20 - (2 × standard deviation)
    -- When price hits lower band, stock might be oversold
    bollinger_lower NUMERIC(12,4),

    -- One row per stock per day
    PRIMARY KEY (ticker, date),

    FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE
);

-- Index for RSI screening: "show me oversold stocks (RSI < 30)"
CREATE INDEX idx_indicators_rsi ON technical_indicators (rsi_14);

-- Index for getting latest indicators for a stock
CREATE INDEX idx_indicators_ticker_date ON technical_indicators (ticker, date DESC);

-- Composite index for SMA crossover queries: "sma_50 > sma_200"
CREATE INDEX idx_indicators_sma ON technical_indicators (sma_50, sma_200);

