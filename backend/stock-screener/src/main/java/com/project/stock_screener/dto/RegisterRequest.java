package com.project.stock_screener.dto;

/**
 * Auth DTOs — Data Transfer Objects for authentication.
 *
 * These define the JSON contract between frontend and backend */


//  REGISTER REQUEST

public class RegisterRequest {
    private String fullName;
    private String email;
    private String password;

    public RegisterRequest() {}

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}



