package com.project.stock_screener.security;

import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/* JwtService — Creates and validates JWT tokens. */
@Service
public class JwtService {

    /* SECRET_KEY — The key used to sign and verify tokens. */
    private final SecretKey signingKey;

    /* TOKEN_EXPIRY — How long a token stays valid. */
    private static final long TOKEN_EXPIRY = 86400000; // 24 hours

    /* Constructor — reads the secret from configuration. */
    public JwtService(@Value("${jwt.secret:equiscan-default-jwt-secret-key-change-in-production-2026}") String secret) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes());
    }

    /* generateToken — Creates a new JWT for a user. */
    public String generateToken(String email) {
        return Jwts.builder()
                .subject(email)                                          // who
                .issuedAt(new Date())                                    // when created
                .expiration(new Date(System.currentTimeMillis() + TOKEN_EXPIRY))  // when it expires
                .signWith(signingKey)                                    // sign it
                .compact();                                              // build the string
    }

    /* extractEmail — Reads the user's email from a JWT. */
    public String extractEmail(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)                // verify signature
                .build()
                .parseSignedClaims(token)              // parse the token
                .getPayload()                          // get the payload
                .getSubject();                         // get the "sub" claim (email)
    }

    /* validateToken — Checks if a JWT is valid. */
    public boolean validateToken(String token, String email) {
        try {
            String tokenEmail = extractEmail(token);
            return tokenEmail.equals(email) && !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            // Any JWT parsing error = invalid token
            return false;
        }
    }

    /* isTokenExpired — Checks if the token's expiration date has passed. */
    private boolean isTokenExpired(String token) {
        Date expiration = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getExpiration();
        return expiration.before(new Date());
    }
}


