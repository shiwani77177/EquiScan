# EquiScan — System Architecture

## Overview

EquiScan is a full-stack Indian stock screening platform built with a modern microservice-friendly architecture. It follows a **layered architecture pattern** with clear separation between the presentation layer (React), business logic layer (Spring Boot), and data layer (PostgreSQL).

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│                                                                  │
│   React 18 + Vite + Tailwind CSS + Recharts                     │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│   │Dashboard │ │Screener  │ │ Compare  │ │Watchlist │  ...      │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                         │ Axios (HTTP/JSON)                      │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                      NGINX (Reverse Proxy)                       │
│                                                                  │
│   Port 80 → /api/*  →  Spring Boot (8080)                       │
│             /*      →  React static files                        │
└──────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                   SPRING BOOT APPLICATION                        │
│                      (Java 21, Port 8080)                        │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    Controller Layer                      │   │
│   │  ScreenerController  │  StockController  │  AuthController│  │
│   │  NewsController      │  WatchlistController              │   │
│   └──────────────────────┼──────────────────────────────────┘   │
│                          │                                       │
│   ┌──────────────────────┼──────────────────────────────────┐   │
│   │                    Service Layer                         │   │
│   │  ScreenerService     │  DataIngestionService             │   │
│   │  TechnicalIndicatorService  │  JwtService                │   │
│   └──────────────────────┼──────────────────────────────────┘   │
│                          │                                       │
│   ┌──────────────────────┼──────────────────────────────────┐   │
│   │               Security Layer (Spring Security)           │   │
│   │  JwtAuthFilter → SecurityFilterChain → BCrypt Encoder    │   │
│   └──────────────────────┼──────────────────────────────────┘   │
│                          │                                       │
│   ┌──────────────────────┼──────────────────────────────────┐   │
│   │                Data Access Layer                         │   │
│   │  JdbcTemplate (dynamic queries)  │  JPA (User entity)    │   │
│   │  ScreeningQueryBuilder           │  UserRepository        │   │
│   └──────────────────────┼──────────────────────────────────┘   │
│                          │                                       │
│   ┌──────────────────────┼──────────────────────────────────┐   │
│   │              External Data Clients                       │   │
│   │  YahooFinanceClient (prices)  │  AlphaVantageClient      │   │
│   │  (fundamentals)               │                          │   │
│   └─────────────────────────────────────────────────────────┘   │
└──────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL 16 (Port 5432)                     │
│                                                                  │
│   Tables:                                                        │
│   ┌──────────┐ ┌──────────────┐ ┌──────────────┐               │
│   │  stocks   │ │ daily_prices  │ │ fundamentals  │              │
│   │  (50 rows)│ │ (5000+ rows)  │ │  (50 rows)    │             │
│   └──────────┘ └──────────────┘ └──────────────┘               │
│   ┌────────────────────┐ ┌──────────┐ ┌──────────┐             │
│   │technical_indicators │ │  users   │ │ watchlist │             │
│   │    (50 rows)        │ │          │ │           │             │
│   └────────────────────┘ └──────────┘ └──────────┘             │
│                                                                  │
│   Materialized View:                                             │
│   ┌─────────────────────────────────────────────┐               │
│   │  stock_screening_view (pre-joined, indexed) │               │
│   │  11 indexes for fast screening queries      │               │
│   └─────────────────────────────────────────────┘               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend

| Technology      | Version | Purpose                           |
| --------------- | ------- | --------------------------------- |
| Java            | 21      | Core language (LTS)               |
| Spring Boot     | 3.3.4   | Application framework             |
| Spring Security | 6.x     | Authentication & authorization    |
| Spring Data JPA | 3.x     | ORM for User entity               |
| JdbcTemplate    | —       | Dynamic SQL queries for screening |
| Flyway          | 10.x    | Database migrations               |
| JJWT            | 0.12.6  | JWT token generation & validation |
| BCrypt          | —       | Password hashing                  |
| Jackson         | —       | JSON serialization                |
| Maven           | 3.9     | Build tool                        |

### Frontend

| Technology   | Version | Purpose                        |
| ------------ | ------- | ------------------------------ |
| React        | 18.x    | UI framework                   |
| Vite         | 5.x     | Build tool & dev server        |
| Tailwind CSS | 4.x     | Utility-first styling          |
| Recharts     | 2.x     | Charts (bar, pie, area, radar) |
| Axios        | 1.x     | HTTP client                    |
| React Router | 6.x     | Client-side routing            |
| Zustand      | 4.x     | State management               |

### Infrastructure

| Technology    | Purpose                              |
| ------------- | ------------------------------------ |
| Docker        | Containerization (multi-stage build) |
| Nginx         | Reverse proxy (local)                |
| PostgreSQL 16 | Primary database                     |
| Railway       | Cloud deployment                     |

### Data Sources

| Source        | Usage                | Limits                   |
| ------------- | -------------------- | ------------------------ |
| Yahoo Finance | Daily OHLCV prices   | Unlimited, no API key    |
| Alpha Vantage | Company fundamentals | 25 calls/day (free tier) |

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────────┐
│     stocks       │       │    daily_prices       │
├──────────────────┤       ├──────────────────────┤
│ ticker (PK)      │──────<│ ticker (FK)           │
│ company_name     │       │ date                  │
│ sector           │       │ open, high, low, close│
│ industry         │       │ adj_close, volume     │
│ exchange         │       └──────────────────────┘
│ market_cap       │
│ country          │       ┌──────────────────────┐
│ updated_at       │       │   fundamentals       │
└──────────────────┘──────<├──────────────────────┤
                           │ ticker (FK)           │
                           │ report_date           │
                           │ pe_ratio, eps          │
                           │ revenue, net_income    │
                           │ dividend_yield, roe    │
                           │ debt_to_equity         │
                           │ price_to_book, fcf     │
                           └──────────────────────┘

                           ┌──────────────────────┐
                      ────<│ technical_indicators  │
                           ├──────────────────────┤
                           │ ticker (FK)           │
                           │ date                  │
                           │ sma_50, sma_200       │
                           │ rsi_14                │
                           │ macd, macd_signal     │
                           └──────────────────────┘

┌──────────────────┐       ┌──────────────────────┐
│     users        │       │     watchlist         │
├──────────────────┤       ├──────────────────────┤
│ id (PK)          │──────<│ user_id (FK)          │
│ full_name        │       │ ticker (FK → stocks)  │
│ email (UNIQUE)   │       │ added_at              │
│ password_hash    │       └──────────────────────┘
│ role             │
│ created_at       │
│ last_login_at    │
└──────────────────┘
```

### Materialized View: `stock_screening_view`

Pre-joins all 4 data tables into a single denormalized view for sub-50ms screening queries:

```sql
stocks ← LEFT JOIN daily_prices (latest)
       ← LEFT JOIN fundamentals (latest)
       ← LEFT JOIN technical_indicators (latest)
```

**11 Indexes** for optimized filtering:

- ticker (unique), sector, market_cap, pe_ratio, rsi_14
- dividend_yield, volume, price, sector+market_cap
- pe_ratio+dividend_yield, sma_50+sma_200

---

## Data Flow

### 1. Data Ingestion Pipeline

```
Yahoo Finance API                Alpha Vantage API
(no key, unlimited)              (25 calls/day)
       │                                │
       ▼                                ▼
  OHLCV Prices                  Company Overview
  (6 months history)            (P/E, EPS, ROE, etc.)
       │                                │
       ▼                                ▼
  daily_prices table            stocks + fundamentals tables
       │
       ▼
  TechnicalIndicatorService
  (SMA-50, SMA-200, RSI-14, MACD)
       │
       ▼
  technical_indicators table
       │
       ▼
  REFRESH MATERIALIZED VIEW stock_screening_view
```

### 2. Screening Query Flow

```
Frontend: User adds filters + clicks "Screen Stocks"
    │
    ▼
POST /api/v1/screen
{ filters: [{field: "pe_ratio", operator: "lt", value: 20}], sort: {...} }
    │
    ▼
ScreenerController → ScreenerService
    │
    ▼
ScreeningQueryBuilder
  - Validates fields against ScreenableFieldRegistry (whitelist)
  - Builds parameterized SQL dynamically
  - Prevents SQL injection via PreparedStatement
    │
    ▼
JdbcTemplate executes query on stock_screening_view
    │
    ▼
Results mapped to StockRow DTOs → JSON response → Frontend renders
```

### 3. Authentication Flow

```
REGISTER:
  Client → POST /auth/register {name, email, password}
  Server → BCrypt.hash(password) → Save to users table
  Server → JwtService.generateToken(email) → Return JWT

LOGIN:
  Client → POST /auth/login {email, password}
  Server → Find user by email → BCrypt.matches(password, hash)
  Server → JwtService.generateToken(email) → Return JWT

PROTECTED REQUEST:
  Client → GET /api/v1/watchlist (Authorization: Bearer <JWT>)
  JwtAuthFilter → Extract token → Validate signature → Set SecurityContext
  SecurityConfig → Check .authenticated() → Allow/Deny
  Controller → Process request
```

---

## API Endpoints

### Public Endpoints (No Authentication Required)

| Method | Endpoint                         | Description                     |
| ------ | -------------------------------- | ------------------------------- |
| POST   | `/api/v1/screen`                 | Screen stocks with filters      |
| GET    | `/api/v1/metadata/filters`       | Available filter fields         |
| GET    | `/api/v1/metadata/sectors`       | Unique sector names             |
| GET    | `/api/v1/stocks/{ticker}`        | Stock detail                    |
| GET    | `/api/v1/stocks/{ticker}/prices` | Historical prices               |
| GET    | `/api/v1/news`                   | Market news                     |
| POST   | `/api/v1/auth/register`          | Create account                  |
| POST   | `/api/v1/auth/login`             | Login                           |
| POST   | `/api/v1/admin/ingest`           | Trigger Yahoo Finance ingestion |

### Protected Endpoints (JWT Required)

| Method | Endpoint                     | Description           |
| ------ | ---------------------------- | --------------------- |
| GET    | `/api/v1/auth/me`            | Current user info     |
| GET    | `/api/v1/watchlist`          | User's watchlist      |
| POST   | `/api/v1/watchlist/{ticker}` | Add to watchlist      |
| DELETE | `/api/v1/watchlist/{ticker}` | Remove from watchlist |

---

## Deployment Architecture

### Local (Docker Compose)

```
docker-compose.yml
  ├── screener-app (Nginx + Spring Boot via Supervisor)
  ├── screener-db (PostgreSQL 16)
  └── screener-redis (Redis 7)
```

### Production (Railway)

```
Railway Project
  ├── EquiScan Service (Dockerfile.railway → Spring Boot + static React)
  └── PostgreSQL (Railway managed)
```

### Key Differences

| Aspect           | Local             | Production                          |
| ---------------- | ----------------- | ----------------------------------- |
| Frontend serving | Nginx             | Spring Boot (static resources)      |
| Process manager  | Supervisor        | Single process (java -jar)          |
| Database         | Docker PostgreSQL | Railway managed PostgreSQL          |
| Redis            | Docker Redis      | Disabled (autoconfigure exclude)    |
| Port             | 80 (Nginx)        | 8080 (Spring Boot, Railway assigns) |

---

## Design Decisions

### 1. Materialized View over Runtime JOINs

**Why:** Screening queries need to filter across 4 tables simultaneously. Runtime JOINs on every request would be slow. A materialized view pre-computes the JOIN once and indexes it, achieving sub-50ms query times.

### 2. JdbcTemplate over JPA for Screening

**Why:** The screening query is dynamic — users can filter on any combination of 19 fields with various operators. JPA's Criteria API is verbose and hard to maintain for this use case. JdbcTemplate with parameterized SQL gives full control and SQL injection prevention through PreparedStatement.

### 3. Yahoo Finance + Alpha Vantage Dual Source

**Why:** Alpha Vantage has detailed fundamentals but limits free users to 25 API calls/day. Yahoo Finance has no limits and no API key requirement, making it ideal for daily price ingestion of 50+ stocks. Using both gives the best of both worlds.

### 4. JWT over Sessions

**Why:** Stateless authentication scales horizontally. The server doesn't need to store session state, making it compatible with containerized deployments where instances can be added/removed freely.

### 5. Flyway for Migrations

**Why:** Version-controlled database schema changes ensure consistency across local development, Docker, and Railway production environments. Each migration is idempotent and tracked in `flyway_schema_history`.
