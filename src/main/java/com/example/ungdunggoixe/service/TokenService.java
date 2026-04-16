package com.example.ungdunggoixe.service;


import com.example.ungdunggoixe.entity.Token;
import com.example.ungdunggoixe.repository.TokenRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@AllArgsConstructor
public class TokenService {
    private final TokenRepository tokenRepository;
    public void saveToken(String jid ,Long userID,Instant expiration){
        Instant now = Instant.now();
        long timetoLive=expiration.getEpochSecond()-now.getEpochSecond();
        Token token = Token.builder()
                .tokenID(jid)
                .userID(userID)
                .timeToLive(timetoLive)
                .build();
            tokenRepository.save(token);
    }
    public Token findbyJTI(String jti){
        return tokenRepository.findById(jti).orElse(null);
    }
    public void deleteToken(String jti){
        tokenRepository.deleteById(jti);
    }
}
