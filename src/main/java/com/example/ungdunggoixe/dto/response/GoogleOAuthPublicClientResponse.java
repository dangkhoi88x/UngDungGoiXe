package com.example.ungdunggoixe.dto.response;

/** Public OAuth Web client id only (no secret); SPA may read when VITE is unset. */
public record GoogleOAuthPublicClientResponse(String clientId) {
}
