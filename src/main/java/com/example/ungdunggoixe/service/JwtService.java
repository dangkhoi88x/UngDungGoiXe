package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.TokenType;
import com.example.ungdunggoixe.dto.TokenPayload;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class JwtService {

    @Value("${jwt.audience}")
    private String audience;

    private final JwtEncoder jwtEncoder;
    private final JwtDecoder accessTokenDecoder;
    private final JwtDecoder refreshTokenDecoder;

    public JwtService(
            JwtEncoder jwtEncoder,
            @Qualifier("accessTokenDecoder") JwtDecoder accessTokenDecoder,
            @Qualifier("refreshTokenDecoder") JwtDecoder refreshTokenDecoder) {
        this.jwtEncoder = jwtEncoder;
        this.accessTokenDecoder = accessTokenDecoder;
        this.refreshTokenDecoder = refreshTokenDecoder;
    }

    public String generateAccessToken(Long userId, List<String> roles) {
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        Instant now = Instant.now();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(userId.toString())
                .audience(List.of(audience))
                .issuedAt(now)
                .expiresAt(now.plusSeconds(3600))
                .issuer("http://localhost:8080")
                .claim("roles", roles)
                .claim("typ", TokenType.ACCESS)
                .id(UUID.randomUUID().toString())
                .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public TokenPayload generateRefreshToken(Long userId) {
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(3600L * 24 * 14);
        String jti = UUID.randomUUID().toString();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(userId.toString())
                .id(jti)
                .audience(List.of(audience))
                .issuedAt(now)
                .expiresAt(expiresAt)
                .issuer("http://localhost:8080")
                .claim("typ", TokenType.REFRESH)
                .build();

        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return TokenPayload.builder()
                .tokenValue(token)
                .jti(jti)
                .expiration(expiresAt)
                .build();
    }

    public TokenPayload validateToken(String token, TokenType type) {
        JwtDecoder decoder = (type == TokenType.REFRESH) ? refreshTokenDecoder : accessTokenDecoder;
        Jwt jwt = decoder.decode(token);

        String typ = jwt.getClaim("typ").toString();
        if (TokenType.valueOf(typ) != type) {
            throw new JwtException("Invalid token type");
        }

        Long userId = Long.parseLong(jwt.getSubject());
        List<String> roles = extractRoles(jwt.getClaim("roles"));
        String jti = jwt.getId();
        Instant issuedAt = jwt.getIssuedAt();
        Instant expiration = jwt.getExpiresAt();

        return TokenPayload.builder()
                .userId(userId)
                .roles(roles)
                .jti(jti)
                .expiration(expiration)
                .issuedAt(issuedAt)
                .build();
    }

    private List<String> extractRoles(Object claimRoles) {
        if (claimRoles == null) {
            return Collections.emptyList();
        }
        if (claimRoles instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        return Collections.emptyList();
    }
}
