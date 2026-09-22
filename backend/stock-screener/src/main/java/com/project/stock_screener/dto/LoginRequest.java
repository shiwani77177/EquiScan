package com.project.stock_screener.dto;

/**
 * What the frontend sends to POST /api/v1/auth/login:
 * {
 *   "email": "shiwani@example.com",
 *   "password": "mypassword123"
 * }
 *
 * The backend looks up the user by email, then uses
 * BCrypt.matches(password, stored_hash) to verify.
 */
public class LoginRequest {
    private String email;
    private String password;

    public LoginRequest() {}

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}


