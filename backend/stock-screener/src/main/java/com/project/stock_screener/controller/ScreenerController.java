package com.project.stock_screener.screening.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.project.stock_screener.dto.ScreenRequest;
import com.project.stock_screener.dto.ScreenResult;
import com.project.stock_screener.screening.ScreenableFieldRegistry;
import com.project.stock_screener.screening.ScreenerService;

/* ScreenerController — The REST API endpoints for stock screening. */
@RestController
@RequestMapping("/api/v1")
@CrossOrigin
public class ScreenerController {

    // The screening service that runs queries
    private final ScreenerService screenerService;

    // The field registry for the metadata endpoint
    private final ScreenableFieldRegistry fieldRegistry;

    /* Constructor — Spring injects both dependencies automatically. */
    public ScreenerController(ScreenerService screenerService,
                              ScreenableFieldRegistry fieldRegistry) {
        this.screenerService = screenerService;
        this.fieldRegistry = fieldRegistry;
    }

    //Sends the request
    @PostMapping("/screen")
    public ResponseEntity<ScreenResult> screen(@RequestBody ScreenRequest request) {
        ScreenResult result = screenerService.screen(request);
        return ResponseEntity.ok(result);
    }

    //Returns all available filter fields
    @GetMapping("/metadata/filters")
    public ResponseEntity<Map<String, ScreenableFieldRegistry.FieldDef>> getFilters() {
        return ResponseEntity.ok(fieldRegistry.allFields());
    }

    //Returns all unique sector names
    @GetMapping("/metadata/sectors")
    public ResponseEntity<List<String>> getSectors() {
        List<String> sectors = screenerService.getSectors();
        return ResponseEntity.ok(sectors);
    }
}


