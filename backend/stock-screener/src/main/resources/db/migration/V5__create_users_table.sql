-- V5: Users table for authentication

CREATE TABLE users (
    -- Auto-incrementing primary key
    id              BIGSERIAL       PRIMARY KEY,

    -- User's full name
    full_name       VARCHAR(100)    NOT NULL,

    -- Email serves as the login username
    email           VARCHAR(255)    NOT NULL UNIQUE,

    -- BCrypt hashed password
    password_hash   VARCHAR(255)    NOT NULL,

    -- Account role: USER or ADMIN
    role            VARCHAR(20)     NOT NULL DEFAULT 'USER',

    -- When the account was created
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    -- When the user last logged in
    last_login_at   TIMESTAMP
);

-- Index on email for fast login lookups
CREATE INDEX idx_users_email ON users (email);


