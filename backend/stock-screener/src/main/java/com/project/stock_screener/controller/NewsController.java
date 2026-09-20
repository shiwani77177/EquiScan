package com.project.stock_screener.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/* NewsController — Serves market news headlines. */
@RestController
@RequestMapping("/api/v1/news")
@CrossOrigin
public class NewsController {

    private static final List<Map<String, Object>> ALL_NEWS = List.of(
        Map.of(
            "id", 1,
            "title", "Reliance Industries announces new energy investment plan",
            "summary", "Reliance Industries Ltd has announced a comprehensive plan to invest ₹75,000 crore in renewable energy over the next five years. The company aims to become a net-zero carbon company by 2035, with major investments in solar, hydrogen, and battery technology.",
            "source", "Economic Times",
            "time", "3h ago",
            "sector", "Energy",
            "tickers", List.of("RELIANCE"),
            "url", "https://economictimes.indiatimes.com/industry/energy"
        ),
        Map.of(
            "id", 2,
            "title", "HDFC Bank reports steady loan growth in latest quarter",
            "summary", "HDFC Bank has reported a 17.5% year-on-year growth in advances for the latest quarter. The bank's retail loan portfolio saw strong traction with home loans and personal loans driving growth. Asset quality remained stable with GNPA at 1.24%.",
            "source", "Moneycontrol",
            "time", "2h ago",
            "sector", "Banking",
            "tickers", List.of("HDFCBANK"),
            "url", "https://www.moneycontrol.com/news/business/banks/"
        ),
        Map.of(
            "id", 3,
            "title", "IT majors TCS and Infosys see strong deal pipeline amid global demand",
            "summary", "TCS and Infosys have reported robust deal wins in the latest quarter, signaling improved demand for IT services globally. TCS signed deals worth $8.6 billion while Infosys guided for 4-7% revenue growth in constant currency terms.",
            "source", "Business Standard",
            "time", "15h ago",
            "sector", "IT",
            "tickers", List.of("TCS", "INFY"),
            "url", "https://www.business-standard.com/industry/news"
        ),
        Map.of(
            "id", 4,
            "title", "Sun Pharma gains regulatory approval for key drug in US market",
            "summary", "Sun Pharmaceutical Industries has received FDA approval for its generic version of a widely-prescribed medication. The approval is expected to add ₹1,200 crore to annual revenues and strengthen Sun Pharma's position in the US generics market.",
            "source", "LiveMint",
            "time", "2d ago",
            "sector", "Pharma",
            "tickers", List.of("SUNPHARMA"),
            "url", "https://www.livemint.com/companies/news"
        ),
        Map.of(
            "id", 5,
            "title", "Tata Motors EV sales accelerate ahead of festive season",
            "summary", "Tata Motors has reported a 45% surge in electric vehicle sales, driven by strong demand for the Nexon EV and Tiago EV models. The company now commands over 70% market share in the Indian EV passenger vehicle segment.",
            "source", "CNBC-TV18",
            "time", "1d ago",
            "sector", "Auto",
            "tickers", List.of("TATAMOTORS"),
            "url", "https://www.cnbctv18.com/auto/"
        ),
        Map.of(
            "id", 6,
            "title", "Nifty hits fresh highs as banking stocks rally on strong earnings",
            "summary", "The benchmark Nifty 50 index touched a new all-time high, buoyed by strong quarterly earnings from banking heavyweights. ICICI Bank and SBI led the rally with both reporting better-than-expected profit growth.",
            "source", "Economic Times",
            "time", "5h ago",
            "sector", "Markets",
            "tickers", List.of("ICICIBANK", "SBIN"),
            "url", "https://economictimes.indiatimes.com/markets/stocks/news"
        ),
        Map.of(
            "id", 7,
            "title", "Bajaj Finance posts robust growth in AUM, stock surges 3%",
            "summary", "Bajaj Finance reported a 29% year-on-year growth in assets under management, reaching ₹3.3 lakh crore. New loan bookings grew 24% driven by consumer loans and SME financing segments.",
            "source", "Moneycontrol",
            "time", "8h ago",
            "sector", "Financial Services",
            "tickers", List.of("BAJFINANCE"),
            "url", "https://www.moneycontrol.com/news/business/stocks/"
        ),
        Map.of(
            "id", 8,
            "title", "Coal India dividends attract long-term investors amid energy transition",
            "summary", "Coal India's generous dividend yield of over 5% continues to attract income-focused investors. Despite the global push for clean energy, analysts expect Coal India's earnings to remain stable over the medium term due to India's growing energy demand.",
            "source", "LiveMint",
            "time", "1d ago",
            "sector", "Metals",
            "tickers", List.of("COALINDIA"),
            "url", "https://www.livemint.com/market/stock-market-news"
        ),
        Map.of(
            "id", 9,
            "title", "Hindustan Unilever launches new product range targeting rural markets",
            "summary", "HUL has launched affordable product variants specifically designed for rural India. The FMCG giant expects rural demand recovery to accelerate in the coming quarters, driven by improved monsoon and government spending.",
            "source", "Business Standard",
            "time", "6h ago",
            "sector", "FMCG",
            "tickers", List.of("HINDUNILVR"),
            "url", "https://www.business-standard.com/companies/news"
        ),
        Map.of(
            "id", 10,
            "title", "Tata Steel capacity expansion plan on track, targets 40 MTPA by 2030",
            "summary", "Tata Steel confirmed its domestic capacity expansion plan is progressing as scheduled. The company aims to reach 40 million tonnes per annum of steelmaking capacity by 2030, with investments in Kalinganagar and Jamshedpur facilities.",
            "source", "CNBC-TV18",
            "time", "12h ago",
            "sector", "Metals",
            "tickers", List.of("TATASTEEL"),
            "url", "https://www.cnbctv18.com/market/"
        ),
        Map.of(
            "id", 11,
            "title", "L&T wins ₹7,000 crore infrastructure orders from Middle East",
            "summary", "Larsen & Toubro has secured significant international orders worth ₹7,000 crore from the Middle East region. The orders span power transmission, water infrastructure, and smart city projects across Saudi Arabia and UAE.",
            "source", "Economic Times",
            "time", "4h ago",
            "sector", "Infrastructure",
            "tickers", List.of("LT"),
            "url", "https://economictimes.indiatimes.com/industry/indl-goods/svs/engineering"
        ),
        Map.of(
            "id", 12,
            "title", "Bharti Airtel 5G rollout reaches 500 cities, ARPU continues to rise",
            "summary", "Bharti Airtel's 5G network now covers 500 cities across India. The telecom major's average revenue per user (ARPU) rose to ₹211, driven by premiumization and the migration of 2G users to 4G/5G networks.",
            "source", "Moneycontrol",
            "time", "1d ago",
            "sector", "Telecom",
            "tickers", List.of("BHARTIARTL"),
            "url", "https://www.moneycontrol.com/news/business/telecom/"
        )
    );

    /**
     * GET /api/v1/news — Returns all news, optionally filtered by sector.
     *
     * Usage:
     *   /api/v1/news           → all news
     *   /api/v1/news?sector=IT → only IT sector news
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getNews(
            @RequestParam(required = false) String sector) {

        List<Map<String, Object>> filtered;
        if (sector == null || sector.isEmpty() || sector.equalsIgnoreCase("All")) {
            filtered = ALL_NEWS;
        } else {
            filtered = ALL_NEWS.stream()
                    .filter(n -> sector.equalsIgnoreCase((String) n.get("sector")))
                    .toList();
        }

        // Get unique sectors for the filter buttons
        List<String> sectors = ALL_NEWS.stream()
                .map(n -> (String) n.get("sector"))
                .distinct()
                .sorted()
                .toList();

        return ResponseEntity.ok(Map.of(
                "news", filtered,
                "total", filtered.size(),
                "sectors", sectors
        ));
    }
}


