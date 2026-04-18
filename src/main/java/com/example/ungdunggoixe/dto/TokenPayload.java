package com.example.ungdunggoixe.dto;

import lombok.Builder;

import java.time.Instant;
import java.util.List;
@Builder
public record TokenPayload(
        String tokenValue,
        Long userId,
        String jti,
        Instant issuedAt,
        Instant expiration,
        List<String> roles


) {
}
