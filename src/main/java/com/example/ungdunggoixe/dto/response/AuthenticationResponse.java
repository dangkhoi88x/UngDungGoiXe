package com.example.ungdunggoixe.dto.response;

import lombok.Builder;

@Builder
public record AuthenticationResponse(
        Long userId,
        String firstName,
        String lastName,
        String accessToken,
        String refreshToken) {

}
