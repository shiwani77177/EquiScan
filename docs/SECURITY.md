# EquiScan — Security Documentation

## Overview

EquiScan implements multiple layers of security to protect user data, prevent common web vulnerabilities, and ensure API integrity. This document covers all security measures implemented in the application.

---

## Authentication

### JWT (JSON Web Token) Implementation

EquiScan uses stateless JWT-based authentication, meaning the server does not store session data.

**How It Works:**

```
1. User registers/logs in with email + password
2. Server validates credentials
3. Server generates a signed JWT containing:
   - sub: user's email
   - iat: issued timestamp
   - exp: expiration timestamp (24 hours)
4. Client stores JWT in localStorage
5. Client sends JWT in Authorization header for protected requests
6. Server validates JWT signature on every request via JwtAuthFilter
```

**Token Structure:**

```
Header:    { "alg": "HS256" }
Payload:   { "sub": "user@email.com", "iat": 1700000000, "exp": 1700086400 }
Signature: HMAC-SHA256(base64(header) + "." + base64(payload), SECRET_KEY)
```

**Configuration:**
| Parameter | Value | Rationale |
|---|---|---|
| Algorithm | HS256 (HMAC-SHA256) | Industry standard, fast, secure |
| Expiration | 24 hours | Balance between security and UX |
| Secret key length | 256+ bits (32+ characters) | Minimum for HS256 |
| Secret source | Environment variable `JWT_SECRET` | Never hardcoded |

**Implementation Files:**

- `JwtService.java` — Token generation, validation, email extraction
- `JwtAuthFilter.java` — Request interception and token verification
- `SecurityConfig.java` — Endpoint protection rules

---

## Password Security

### BCrypt Hashing

Passwords are **never stored in plain text**. Every password goes through BCrypt before touching the database.

**How BCrypt Works:**

```
User enters:     "mypassword123"
BCrypt produces: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
                  │  │  │                                                        │
                  │  │  └── Random 22-character salt (unique per password)        │
                  │  └───── Cost factor (10 = 2^10 = 1024 iterations)           │
                  └──────── BCrypt version identifier                            │
                            └── 31-character hash output ────────────────────────┘
```

**Why BCrypt Over Other Algorithms:**

| Algorithm | Speed            | Suitable? | Reason                             |
| --------- | ---------------- | --------- | ---------------------------------- |
| MD5       | ~1 billion/sec   | ❌        | Too fast, trivially crackable      |
| SHA-256   | ~500 million/sec | ❌        | Too fast for passwords             |
| BCrypt    | ~1,000/sec       | ✅        | Intentionally slow, adaptive       |
| Argon2    | ~500/sec         | ✅        | Modern alternative (not used here) |

**BCrypt is intentionally slow** — at 10 rounds, each hash takes ~100ms. This is:

- Fast enough for a single user login (imperceptible delay)
- Too slow for an attacker trying millions of guesses (would take years)

**Key Security Properties:**

1. **Salted** — Same password produces different hashes each time
2. **Adaptive** — Cost factor can be increased as hardware gets faster
3. **One-way** — Cannot reverse the hash to get the original password

**Implementation:**

```java
// Registration: hash the password
String hash = passwordEncoder.encode("mypassword123");
// → "$2a$10$N9qo8uLO..."

// Login: verify against stored hash
boolean matches = passwordEncoder.matches("mypassword123", storedHash);
// → true
```

---

## Authorization

### Endpoint Protection Matrix

```
PUBLIC (No authentication required):
  POST /api/v1/auth/register        ← Anyone can create an account
  POST /api/v1/auth/login           ← Anyone can log in
  POST /api/v1/screen               ← Core screener feature
  GET  /api/v1/metadata/**          ← Filter metadata
  GET  /api/v1/stocks/**            ← Stock data
  GET  /api/v1/news/**              ← Market news
  POST /api/v1/admin/ingest         ← Data ingestion trigger
  GET  /actuator/health             ← Health check

PROTECTED (JWT token required):
  GET    /api/v1/auth/me            ← Current user profile
  GET    /api/v1/watchlist           ← User's personal watchlist
  POST   /api/v1/watchlist/{ticker}  ← Add to watchlist
  DELETE /api/v1/watchlist/{ticker}  ← Remove from watchlist
```

**Design Decision:** The screener is public intentionally. Requiring login to use the core feature would drive away potential users. Only personalization features (watchlist, saved screens) require authentication.

### Role-Based Access Control (RBAC)

```
USER role  → Can use all authenticated endpoints
ADMIN role → Same as USER (admin-only features planned for future)
```

Roles are stored in the `users.role` column and loaded into Spring Security's `GrantedAuthority` system via `JwtAuthFilter`.

---

## SQL Injection Prevention

### The Threat

SQL injection is the #1 web application vulnerability (OWASP Top 10). It occurs when user input is concatenated directly into SQL queries.

**Vulnerable code (NOT used in EquiScan):**

```java
// DANGEROUS — never do this
String sql = "SELECT * FROM stocks WHERE sector = '" + userInput + "'";
// If userInput = "'; DROP TABLE stocks; --"
// Result: SELECT * FROM stocks WHERE sector = ''; DROP TABLE stocks; --'
```

### EquiScan's Defense: Two-Layer Protection

**Layer 1: Field Whitelist (`ScreenableFieldRegistry`)**

Only pre-approved column names are allowed in queries:

```java
private static final Map<String, FieldDef> ALLOWED_FIELDS = Map.ofEntries(
    Map.entry("pe_ratio", new FieldDef("pe_ratio", "decimal", "P/E Ratio")),
    Map.entry("eps", new FieldDef("eps", "decimal", "Earnings Per Share")),
    Map.entry("sector", new FieldDef("sector", "text", "Sector")),
    // ... 19 fields total
);

public boolean isAllowed(String fieldName) {
    return ALLOWED_FIELDS.containsKey(fieldName);
}
```

If a user sends `field: "'; DROP TABLE stocks; --"`, the registry check fails before any SQL is built.

**Layer 2: Parameterized Queries (`PreparedStatement`)**

Even if a field passes the whitelist, values are NEVER concatenated into SQL:

```java
// SAFE — EquiScan's approach
String sql = "SELECT * FROM stock_screening_view WHERE pe_ratio < ?";
jdbcTemplate.query(sql, new Object[]{userValue}, rowMapper);
// The '?' is replaced by the database driver, not string concatenation
// Even if userValue = "'; DROP TABLE stocks; --", it's treated as a literal string value
```

**Combined Protection Flow:**

```
User sends: { field: "pe_ratio", operator: "lt", value: 20 }
  │
  ▼
ScreenableFieldRegistry: Is "pe_ratio" in whitelist? → YES ✅
  │
  ▼
ScreeningQueryBuilder: Build "WHERE pe_ratio < ?" with PreparedStatement
  │
  ▼
JdbcTemplate: Execute with parameterized value [20]
  │
  ▼
Database: Safe query, no injection possible
```

---

## CORS (Cross-Origin Resource Sharing)

### Configuration

```java
CorsConfiguration config = new CorsConfiguration();
config.setAllowedOrigins(List.of("*"));               // Allow any origin
config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
config.setAllowedHeaders(List.of("*"));                // Allow any header
```

**Current Setting:** `AllowedOrigins = *` (permissive for development)

**Production Recommendation:** Restrict to specific domains:

```java
config.setAllowedOrigins(List.of(
    "https://equiscan-production.up.railway.app",
    "http://localhost:3000"
));
```

---

## CSRF Protection

CSRF (Cross-Site Request Forgery) protection is **disabled** in EquiScan:

```java
.csrf(AbstractHttpConfigurer::disable)
```

**Why This Is Safe:**

- CSRF attacks target **cookie-based** authentication (browser auto-sends cookies)
- EquiScan uses **JWT in headers** (browser does NOT auto-send Authorization headers)
- JWT-based APIs are inherently immune to CSRF
- The JWT token itself acts as a CSRF token

---

## Data Protection

### What We Store

| Data           | Storage                  | Protection                         |
| -------------- | ------------------------ | ---------------------------------- |
| Email          | PostgreSQL (plain text)  | Unique constraint, indexed         |
| Password       | PostgreSQL (BCrypt hash) | Cannot be reversed                 |
| JWT secret     | Environment variable     | Never in source code               |
| DB credentials | Environment variable     | Never in source code               |
| Watchlist      | localStorage (client)    | Per-browser, no server persistence |

### What We Never Store

- Plain text passwords
- Credit card information
- Personal addresses or phone numbers
- API keys in source code

### Environment Variables (Secrets Management)

```yaml
# application-docker.yml — references environment variables, never hardcodes
jwt:
  secret: ${JWT_SECRET}

spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL}
    password: ${SPRING_DATASOURCE_PASSWORD}
```

On Railway, these are set in the service's Variables tab and injected at runtime.

---

## Session Management

```java
.sessionManagement(session ->
    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
)
```

**STATELESS** means:

- No HTTP sessions created on the server
- No session cookies sent to the client
- No server-side session storage needed
- Each request is independently authenticated via JWT
- Horizontally scalable (any server instance can handle any request)

---

## Security Headers

### Recommended Headers (Future Enhancement)

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

These can be added via Spring Security's header configuration or Nginx.

---

## Threat Model Summary

| Threat            | Mitigation                          | Status                  |
| ----------------- | ----------------------------------- | ----------------------- |
| SQL Injection     | Field whitelist + PreparedStatement | ✅ Protected            |
| Brute Force Login | BCrypt (slow hashing)               | ✅ Protected            |
| Password Theft    | BCrypt hashing (irreversible)       | ✅ Protected            |
| Token Forgery     | HMAC-SHA256 signature               | ✅ Protected            |
| Token Theft       | 24-hour expiration                  | ✅ Mitigated            |
| CSRF              | JWT in headers (not cookies)        | ✅ Not applicable       |
| XSS               | React's auto-escaping               | ✅ Protected            |
| CORS Abuse        | Origin whitelist (configurable)     | ⚠️ Currently permissive |
| Rate Limiting     | Not implemented                     | ❌ Planned              |
| HTTPS             | Railway enforces HTTPS              | ✅ Protected            |
| Secret Exposure   | Environment variables               | ✅ Protected            |

---

## Compliance Notes

- Passwords are hashed with BCrypt (OWASP recommended)
- JWT follows RFC 7519 standard
- HTTPS enforced in production (Railway)
- No PII stored beyond email and name
- No financial transactions processed
- Demo data disclaimer displayed on all pages
