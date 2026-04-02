package com.example.ungdunggoixe.service;

import com.nimbusds.jose.JWSAlgorithm;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Instant;
@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtEncoder jwtEncoder;

    public String generateAccessToken(Long userId) {
        // Header
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();

        // Payload
        Instant now = Instant.now();

        JwtClaimsSet jwtClaimsSet = JwtClaimsSet.builder()
                .subject(userId.toString())
                .issuedAt(now)
                .expiresAt(now.plusSeconds(3600))
                .issuer("http://localhost:8080")
                .claim("roles", "USER")
                .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(header, jwtClaimsSet)).getTokenValue();
    }

    public String generateRefreshToken(Long userId) {
        // Header
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();

        // Payload
        Instant now = Instant.now();

        JwtClaimsSet jwtClaimsSet = JwtClaimsSet.builder()
                .subject(userId.toString())
                .issuedAt(now)
                .expiresAt(now.plusSeconds(3600 * 24 * 14))
                .issuer("http://localhost:8080")
                .claim("roles", "USER")
                .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(header, jwtClaimsSet)).getTokenValue();
    }

}
