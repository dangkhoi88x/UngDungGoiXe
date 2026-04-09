package com.example.ungdunggoixe.dto;

import lombok.Builder;

import java.util.List;
@Builder
public record TokenPayload(
        Long userId,
        List<String> roles
) {
}
