-- Watchlist table: stores which stocks each user is tracking
-- Uses localStorage as fallback when user is not logged in

CREATE TABLE watchlist (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       REFERENCES users(id) ON DELETE CASCADE,
    ticker      VARCHAR(20)  NOT NULL REFERENCES stocks(ticker),
    added_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, ticker)
);

CREATE INDEX idx_watchlist_user ON watchlist (user_id);
CREATE INDEX idx_watchlist_ticker ON watchlist (ticker);


