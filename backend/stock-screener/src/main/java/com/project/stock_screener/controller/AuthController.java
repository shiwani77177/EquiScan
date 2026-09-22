package com.project.stock_screener.controller;

import java.time.LocalDateTime;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.project.stock_screener.dto.AuthResponse;
import com.project.stock_screener.dto.LoginRequest;
import com.project.stock_screener.dto.RegisterRequest;
import com.project.stock_screener.entity.User;
import com.project.stock_screener.entity.UserRepository;
import com.project.stock_screener.security.JwtService;

/* AuthController — Registration and login endpoints. */
@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    /*Create a new user account. */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        log.info("Registration attempt for email: {}", request.getEmail());

        // Validation
        if (request.getFullName() == null || request.getFullName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Full name is required"));
        }
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
        }

        // Check if email already taken 
        if (userRepository.existsByEmail(request.getEmail().trim().toLowerCase())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "An account with this email already exists"));
        }

        // Create user
        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(request.getEmail().trim().toLowerCase());

        // Hash the password 
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole("USER");

        // Save to database
        userRepository.save(user);
        log.info("User registered successfully: {}", user.getEmail());

        // Generate JWT token
        String token = jwtService.generateToken(user.getEmail());

        // Return response
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthResponse(token, user.getEmail(), user.getFullName(), "Registration successful"));
    }

    /* Login with email and password.*/
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        log.info("Login attempt for email: {}", request.getEmail());

        // Find user 
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElse(null);

        // Verify credentials
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Failed login attempt for email: {}", request.getEmail());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password"));
        }

        // Update last login time
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("User logged in successfully: {}", user.getEmail());

        // Generate JWT and return
        String token = jwtService.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, user.getEmail(), user.getFullName(), "Login successful"));
    }

    /* GET /api/v1/auth/me — Get current logged-in user's info. */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        // Get email from SecurityContext (set by JwtAuthFilter)
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not authenticated"));
        }

        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not found"));
        }

        return ResponseEntity.ok(Map.of(
                "email", user.getEmail(),
                "fullName", user.getFullName(),
                "role", user.getRole(),
                "createdAt", user.getCreatedAt().toString()
        ));
    }
}


