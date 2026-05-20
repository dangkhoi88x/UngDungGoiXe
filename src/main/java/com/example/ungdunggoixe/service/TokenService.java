package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.entity.BlacklistedToken;
import com.example.ungdunggoixe.entity.RefreshToken;
import com.example.ungdunggoixe.repository.BlacklistedTokenRepository;
import com.example.ungdunggoixe.repository.RefreshTokenRepository;
import java.time.Instant;

public interface TokenService {
    void saveRefreshToken(String jti, long userId, Instant expiresAt);
    RefreshToken findRefreshByJti(String jti);
    void deleteRefreshToken(String jti);
    void blacklistAccessToken(String jti, long userId, Instant accessExpiresAt);
    boolean isAccessTokenBlacklisted(String jti);
}
