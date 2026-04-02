package com.example.ungdunggoixe.dto.response;

import lombok.Builder;

@Builder
public record AuthenticationResponse (
    Long userId,
    String accessToken,
    String refreshToken
){

}
