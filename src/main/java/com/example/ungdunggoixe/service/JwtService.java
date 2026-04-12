package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.TokenType;
import com.example.ungdunggoixe.dto.TokenPayload;
import com.nimbusds.jose.JWSAlgorithm;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtEncoder jwtEncoder;
    private final JwtDecoder jwtDecoder;

    public String generateAccessToken(Long userId, List<String> roles) {
        // Header
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();

        // Payload
        Instant now = Instant.now();

        JwtClaimsSet jwtClaimsSet = JwtClaimsSet.builder()
                .subject(userId.toString())
                .issuedAt(now)
                .expiresAt(now.plusSeconds(3600))
                .issuer("http://localhost:8080")
                .claim("roles", roles)
                .claim("typ", TokenType.ACCESS)
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
                .claim("typ", TokenType.REFRESH)
                .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(header, jwtClaimsSet)).getTokenValue();
    }
        public TokenPayload validateToken(String token, TokenType type) {
        try{
            Jwt jwt = jwtDecoder.decode(token);
            String typ = jwt.getClaim("typ").toString();
            if(TokenType.valueOf(typ) != type){
                throw new JwtException("Invalid token type");

            }
            Long userID= Long.parseLong(jwt.getSubject());
            List<String> role= extractRoles(jwt.getClaim("roles"));

            return TokenPayload.builder()
                    .userId(userID)
                    .roles(role)
                    .build();

        }catch (JwtException e){
            throw new JwtException("Invalid token");
        }

        }
        private List<String>  extractRoles(Object claimRoles){
            if(claimRoles == null){
                return Collections.emptyList();
            }
            if(claimRoles instanceof List<?> listRole){
                return listRole.stream()
                        .map(String::valueOf)
                        .toList();
            }
            return Collections.emptyList();
        }
}
