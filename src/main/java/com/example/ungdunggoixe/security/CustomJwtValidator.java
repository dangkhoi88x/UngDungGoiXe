package com.example.ungdunggoixe.security;

import com.example.ungdunggoixe.common.TokenType;
import com.example.ungdunggoixe.repository.TokenRepository;
import lombok.AllArgsConstructor;
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


    @Value("${jwt.audience}")
    private String audience;
    private final TokenRepository tokenRepository;
    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        OAuth2Error invalidToken = new OAuth2Error(
                "invalid_token",
                "Token is invalid or revoked",
                null
        );
        OAuth2Error error = new OAuth2Error("custom_code", "Custom error message", null);
        List<String> audienceList= jwt.getAudience();
        if(!audienceList.contains(audience)){
            return OAuth2TokenValidatorResult.failure(error);
        }

        String typ = jwt.getClaim("typ").toString();
        if(TokenType.valueOf(typ) != TokenType.ACCESS ){
            return OAuth2TokenValidatorResult.failure(error);
        }
        String jti = jwt.getId();
        if (jti == null || jti.isBlank()) {
            return OAuth2TokenValidatorResult.failure(invalidToken);
        }

        if (tokenRepository.existsById(jti)) {
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "Token has been revoked", null)
            );
        }
        return OAuth2TokenValidatorResult.success();
    }


}
