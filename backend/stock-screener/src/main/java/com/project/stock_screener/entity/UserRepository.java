package com.project.stock_screener.entity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/* UserRepository — Database access layer for the User entity.*/
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Find a user by their email address.
     * Used during login: "find the user with this email" 
     **/
    Optional<User> findByEmail(String email);

    /**
     * Check if a user with this email already exists.
     * Used during registration: "is this email already taken?" 
     **/
    boolean existsByEmail(String email);
}


