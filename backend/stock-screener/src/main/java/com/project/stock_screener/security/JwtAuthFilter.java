package com.project.stock_screener.security;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.project.stock_screener.entity.User;
import com.project.stock_screener.entity.UserRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/* JwtAuthFilter — Runs on EVERY incoming HTTP request. */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        // Step 1: Get the Authorization header
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        // Step 2: Extract the token
        String token = authHeader.substring(7);

        try {
            // Step 3: Extract email from token
            String email = jwtService.extractEmail(token);

            // Step 4: Only process if not already authenticated 
            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                // Step 5: Look up the user in the database 
                User user = userRepository.findByEmail(email).orElse(null);

                if (user != null && jwtService.validateToken(token, email)) {
                    // Step 6: Set the authentication 
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    user.getEmail(),        // principal (who)
                                    null,                   // credentials (not needed, token was validated)
                                    List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole()))
                            );

                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
        }

        //  Step 7: Continue the filter chain
        chain.doFilter(request, response);
    }
}


