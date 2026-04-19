package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.entity.BlacklistedToken;
import com.example.ungdunggoixe.entity.RefreshToken;
import com.example.ungdunggoixe.repository.BlacklistedTokenRepository;
import com.example.ungdunggoixe.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class TokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final BlacklistedTokenRepository blacklistedTokenRepository;

    public void saveRefreshToken(String jti, long userId, Instant expiresAt) {
        Instant now = Instant.now();
        long ttl = Math.max(1L, expiresAt.getEpochSecond() - now.getEpochSecond());
        refreshTokenRepository.save(RefreshToken.builder()
                .jti(jti)
                .userId(userId)
                .timeToLiveSeconds(ttl)
                .build());
    }

    public RefreshToken findRefreshByJti(String jti) {
        return refreshTokenRepository.findById(jti).orElse(null);
    }

    public void deleteRefreshToken(String jti) {
        refreshTokenRepository.deleteById(jti);
    }

    public void blacklistAccessToken(String jti, long userId, Instant accessExpiresAt) {
        Instant now = Instant.now();
        long ttl = Math.max(1L, accessExpiresAt.getEpochSecond() - now.getEpochSecond());
        blacklistedTokenRepository.save(BlacklistedToken.builder()
                .jti(jti)
                .userId(userId)
                .timeToLiveSeconds(ttl)
                .build());
    }

    public boolean isAccessTokenBlacklisted(String jti) {
        return blacklistedTokenRepository.existsById(jti);
    }
}
