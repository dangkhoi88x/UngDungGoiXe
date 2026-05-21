package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.dto.request.AuthenticationRequest;
import com.example.ungdunggoixe.dto.response.AuthenticationResponse;

public interface AuthenticationService {
    AuthenticationResponse authenticate(AuthenticationRequest request);
    AuthenticationResponse authenticateWithGoogle(String code, String redirectUri);
    AuthenticationResponse refreshToken(String refreshToken);
    void logOut(String accessToken, String refreshToken);
}
