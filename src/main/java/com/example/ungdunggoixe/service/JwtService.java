package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.TokenType;
import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.dto.TokenPayload;
import com.example.ungdunggoixe.exception.AppException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public interface JwtService {
    String generateAccessToken(Long userId, List<String> roles);
    TokenPayload generateRefreshToken(Long userId);
    TokenPayload validateToken(String token, TokenType type);
}
