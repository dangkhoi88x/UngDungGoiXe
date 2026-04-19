package com.example.ungdunggoixe.security;

import com.example.ungdunggoixe.common.TokenType;
import com.example.ungdunggoixe.repository.BlacklistedTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class CustomJwtValidator implements OAuth2TokenValidator<Jwt> {

    private static final OAuth2Error INVALID = new OAuth2Error(
            "invalid_token",
            "Token is invalid or revoked",
            null);

    @Value("${jwt.audience}")
    private String audience;

    private final BlacklistedTokenRepository blacklistedTokenRepository;

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        List<String> audienceList = jwt.getAudience();
        if (audienceList == null || !audienceList.contains(audience)) {
            return OAuth2TokenValidatorResult.failure(INVALID);
        }

        Object typClaim = jwt.getClaim("typ");
        if (typClaim == null) {
            return OAuth2TokenValidatorResult.failure(INVALID);
        }
        try {
            if (TokenType.valueOf(typClaim.toString()) != TokenType.ACCESS) {
                return OAuth2TokenValidatorResult.failure(INVALID);
            }
        } catch (IllegalArgumentException ex) {
            return OAuth2TokenValidatorResult.failure(INVALID);
        }

        String jti = jwt.getId();
        if (jti == null || jti.isBlank()) {
            return OAuth2TokenValidatorResult.failure(INVALID);
        }

        if (blacklistedTokenRepository.existsById(jti)) {
            return OAuth2TokenValidatorResult.failure(INVALID);
        }
        return OAuth2TokenValidatorResult.success();
    }
}
