package com.project.stock_screener.exception;

import java.time.Instant;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * GlobalExceptionHandler — Catches exceptions thrown by any controller
 * and converts them into clean JSON error responses.
 **/

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /* Handles InvalidFilterException — bad filter from the user */
    @ExceptionHandler(InvalidFilterException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidFilter(InvalidFilterException e) {
        log.warn("Invalid filter: {}", e.getMessage());

        // Build a clean error response as a Map
        Map<String, Object> error = Map.of(
                "error", e.getMessage(),                // "Unknown filter field: banana"
                "status", HttpStatus.BAD_REQUEST.value(), // 400 Bad Request
                "timestamp", Instant.now().toString()     
        );

        return ResponseEntity.badRequest().body(error);
    }


    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception e) {
        log.error("Unexpected error: ", e);

        Map<String, Object> error = Map.of(
                "error", "An unexpected error occurred. Please try again.",
                "status", HttpStatus.INTERNAL_SERVER_ERROR.value(), // 500
                "timestamp", Instant.now().toString()
        );

        return ResponseEntity.internalServerError().body(error);
    }
}


