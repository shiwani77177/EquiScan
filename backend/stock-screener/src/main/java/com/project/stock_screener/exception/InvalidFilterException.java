package com.project.stock_screener.exception;

/* InvalidFilterException — Thrown when a user sends a bad filter. */
public class InvalidFilterException extends RuntimeException {

    public InvalidFilterException(String message) {
        super(message);
    }
}


