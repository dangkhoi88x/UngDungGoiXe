package com.example.ungdunggoixe.configuration;

import com.example.ungdunggoixe.security.CustomJwtValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

@Configuration
@RequiredArgsConstructor
public class JwtConfiguration {
    @Value("${jwt.secret-key}")
    private String secretKey ;

    private final CustomJwtValidator customJwtValidator;

    private SecretKey getSecretKey() {
        return new SecretKeySpec(secretKey.getBytes(), "HmacSHA256");
    }

    @Bean
    public JwtEncoder jwtEncoder() {
        return NimbusJwtEncoder
                .withSecretKey(getSecretKey())
                .algorithm(MacAlgorithm.HS256)
                .build();
    }
    @Bean
    public JwtDecoder jwtDecoder() {
            NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withSecretKey(getSecretKey()) .macAlgorithm(MacAlgorithm.HS256)
                    .build();
        OAuth2TokenValidator<Jwt> jwtTimestampValidator = JwtValidators.createDefault();
        OAuth2TokenValidator<Jwt> withTokenTypeAndTimeStamp= new DelegatingOAuth2TokenValidator<>(jwtTimestampValidator, customJwtValidator);
        jwtDecoder.setJwtValidator(withTokenTypeAndTimeStamp);

        return jwtDecoder;
    }

}
