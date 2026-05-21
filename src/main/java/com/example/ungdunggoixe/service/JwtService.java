package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.TokenType;
import com.example.ungdunggoixe.dto.TokenPayload;

import java.util.List;

public interface JwtService {
    String generateAccessToken(Long userId, List<String> roles);
    TokenPayload generateRefreshToken(Long userId);
    TokenPayload validateToken(String token, TokenType type);
}
