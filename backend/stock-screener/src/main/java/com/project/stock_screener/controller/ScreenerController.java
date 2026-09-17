package com.project.stock_screener.controller;

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

/* ScreenerController — REST API for screening, metadata, and ingestion triggers.*/
@RestController
@RequestMapping("/api/v1")
@CrossOrigin
public class ScreenerController {

    private final ScreenerService screenerService;
    private final ScreenableFieldRegistry fieldRegistry;
    private final DataIngestionService ingestionService;

    public ScreenerController(ScreenerService screenerService,
                              ScreenableFieldRegistry fieldRegistry,
                              DataIngestionService ingestionService) {
        this.screenerService = screenerService;
        this.fieldRegistry = fieldRegistry;
        this.ingestionService = ingestionService;
    }

    // Screening Endpoints

    @PostMapping("/screen")
    public ResponseEntity<ScreenResult> screen(@RequestBody ScreenRequest request) {
        ScreenResult result = screenerService.screen(request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/metadata/filters")
    public ResponseEntity<Map<String, ScreenableFieldRegistry.FieldDef>> getFilters() {
        return ResponseEntity.ok(fieldRegistry.allFields());
    }

    @GetMapping("/metadata/sectors")
    public ResponseEntity<List<String>> getSectors() {
        List<String> sectors = screenerService.getSectors();
        return ResponseEntity.ok(sectors);
    }

    // Admin / Ingestion Endpoints

    @PostMapping("/admin/ingest")
    public ResponseEntity<Map<String, Object>> triggerIngestion() {
        Thread.ofVirtual().start(() -> ingestionService.runIngestion());
        return ResponseEntity.ok(Map.of(
                "message", "Yahoo Finance price ingestion started in background",
                "tickers", ingestionService.getAllTickers().size(),
                "source", "Yahoo Finance",
                "note", "Check docker logs for progress: docker logs -f screener-app"
        ));
    }

    @PostMapping("/admin/ingest-fundamentals")
    public ResponseEntity<Map<String, Object>> triggerFundamentals(
            @RequestBody(required = false) Map<String, List<String>> body) {

        // Get tickers from request body, or default to first 5
        List<String> tickers;
        if (body != null && body.containsKey("tickers")) {
            tickers = body.get("tickers").stream().limit(5).toList();
        } else {
            tickers = ingestionService.getAllTickers().stream().limit(5).toList();
        }

        Thread.ofVirtual().start(() -> ingestionService.runFundamentalsIngestion(tickers));
        return ResponseEntity.ok(Map.of(
                "message", "Alpha Vantage fundamentals ingestion started in background",
                "tickers", tickers,
                "source", "Alpha Vantage",
                "note", "Limited to 5 tickers per run (25 calls/day). Check docker logs for progress."
        ));
    }

    @GetMapping("/admin/tickers")
    public ResponseEntity<Map<String, Object>> getTrackedTickers() {
        return ResponseEntity.ok(Map.of(
                "count", ingestionService.getAllTickers().size(),
                "tickers", ingestionService.getAllTickers()
        ));
    }
}


