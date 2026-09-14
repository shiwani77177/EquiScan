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
import com.project.stock_screener.service.DataIngestionService;

/* ScreenerController — The REST API endpoints for stock screening. */
@RestController
@RequestMapping("/api/v1")
@CrossOrigin
public class ScreenerController {

    // The screening service that runs queries
    private final ScreenerService screenerService;

    // The field registry for the metadata endpoint
    private final ScreenableFieldRegistry fieldRegistry;

    private final DataIngestionService ingestionService;

    /* Constructor — Spring injects both dependencies automatically. */
    public ScreenerController(ScreenerService screenerService,
                              ScreenableFieldRegistry fieldRegistry,
                              DataIngestionService ingestionService) {
        this.screenerService = screenerService;
        this.fieldRegistry = fieldRegistry;
        this.ingestionService = ingestionService;
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

    //Ingestion to trigger data from ALpha Vantage
    @PostMapping("/admin/ingest")
    public ResponseEntity<String> triggerIngestion() {
        Thread.ofVirtual().start(() -> ingestionService.runIngestion());
        return ResponseEntity.ok("Ingestion started in background. Check logs for progress.");
    }
}


