package com.example.ungdunggoixe.security;

import com.example.ungdunggoixe.common.TokenType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CustomJwtValidator implements OAuth2TokenValidator<Jwt> {

    @Value("${jwt.audience}")
    private String audience;

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        OAuth2Error error = new OAuth2Error("custom_code", "Custom error message", null);
        List<String> audienceList= jwt.getAudience();
        if(!audienceList.contains(audience)){
            return OAuth2TokenValidatorResult.failure(error);
        }

        String typ = jwt.getClaim("typ").toString();
        if(TokenType.valueOf(typ) != TokenType.ACCESS ){
            return OAuth2TokenValidatorResult.failure(error);
        }
        return OAuth2TokenValidatorResult.success();
    }


}
