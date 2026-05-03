package com.example.ungdunggoixe.dto.request;

import jakarta.validation.constraints.NotBlank;

public record GoogleOAuthCodeRequest(
        @NotBlank String code,
        @NotBlank String redirectUri) {
}
