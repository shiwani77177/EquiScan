package com.project.stock_screener.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * WatchlistController — Manages user's stock watchlist.
 *
 * All endpoints require JWT authentication.
 **/
@RestController
@RequestMapping("/api/v1/watchlist")
@CrossOrigin
public class WatchlistController {

    private final JdbcTemplate jdbc;

    public WatchlistController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Get current user's email from JWT token.
     */
    private String getCurrentEmail() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        return (String) auth.getPrincipal();
    }

    /**
     * Get current user's ID from email.
     */
    private Long getCurrentUserId() {
        String email = getCurrentEmail();
        if (email == null) return null;
        try {
            return jdbc.queryForObject(
                "SELECT id FROM users WHERE email = ?", Long.class, email);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * GET /api/v1/watchlist — Returns user's watchlist with full stock data.
     */
    @GetMapping
    public ResponseEntity<?> getWatchlist() {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        List<Map<String, Object>> watchlist = jdbc.queryForList("""
            SELECT 
                w.ticker, w.added_at,
                sv.company_name, sv.sector, sv.price, sv.change_percent,
                sv.pe_ratio, sv.eps, sv.rsi_14, sv.market_cap,
                sv.dividend_yield, sv.roe, sv.sma_50, sv.sma_200
            FROM watchlist w
            JOIN stock_screening_view sv ON sv.ticker = w.ticker
            WHERE w.user_id = ?
            ORDER BY w.added_at DESC
            """, userId);

        return ResponseEntity.ok(Map.of(
            "watchlist", watchlist,
            "count", watchlist.size()
        ));
    }

    /**
     * POST /api/v1/watchlist/{ticker} — Add stock to watchlist.
     */
    @PostMapping("/{ticker}")
    public ResponseEntity<?> addToWatchlist(@PathVariable String ticker) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        // Check if stock exists
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM stocks WHERE ticker = ?", Integer.class, ticker);
        if (count == null || count == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Stock not found: " + ticker));
        }

        // Check if already in watchlist
        Integer exists = jdbc.queryForObject(
            "SELECT COUNT(*) FROM watchlist WHERE user_id = ? AND ticker = ?",
            Integer.class, userId, ticker);
        if (exists != null && exists > 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Already in watchlist"));
        }

        jdbc.update("INSERT INTO watchlist (user_id, ticker) VALUES (?, ?)", userId, ticker);

        return ResponseEntity.ok(Map.of(
            "message", "Added to watchlist",
            "ticker", ticker
        ));
    }

    /**
     * DELETE /api/v1/watchlist/{ticker} — Remove stock from watchlist.
     */
    @DeleteMapping("/{ticker}")
    public ResponseEntity<?> removeFromWatchlist(@PathVariable String ticker) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        int deleted = jdbc.update(
            "DELETE FROM watchlist WHERE user_id = ? AND ticker = ?", userId, ticker);

        if (deleted == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Not in watchlist"));
        }

        return ResponseEntity.ok(Map.of(
            "message", "Removed from watchlist",
            "ticker", ticker
        ));
    }
}


