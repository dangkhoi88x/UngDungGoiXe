package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.TokenType;
import com.example.ungdunggoixe.dto.TokenPayload;
import com.example.ungdunggoixe.dto.request.AuthenticationRequest;
import com.example.ungdunggoixe.dto.response.AuthenticationResponse;
import com.example.ungdunggoixe.entity.RefreshToken;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.repository.UserRepository;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.SignedJWT;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

import java.text.ParseException;
import java.time.Instant;
import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

    @Value("${jwt.secret-key}")
    private String secretKey;

    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final TokenService tokenService;

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        var authToken = new UsernamePasswordAuthenticationToken(request.email(), request.password());
        Authentication authentication = authenticationManager.authenticate(authToken);
        var user = (User) authentication.getPrincipal();

        List<String> roles = user.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        String accessToken = jwtService.generateAccessToken(user.getId(), roles);
        TokenPayload refreshToken = jwtService.generateRefreshToken(user.getId());

        tokenService.saveRefreshToken(refreshToken.jti(), user.getId(), refreshToken.expiration());

        return AuthenticationResponse.builder()
                .userId(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .accessToken(accessToken)
                .refreshToken(refreshToken.tokenValue())
                .build();
    }

    public AuthenticationResponse refreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isEmpty()) {
            throw new IllegalArgumentException("Refresh token is empty");
        }
        try {
            SignedJWT signedJWT = SignedJWT.parse(refreshToken);

            boolean isValid = signedJWT.verify(new MACVerifier(secretKey));
            if (!isValid) {
                throw new IllegalArgumentException("Invalid refresh token signature");
            }

            Date expiry = signedJWT.getJWTClaimsSet().getExpirationTime();
            if (expiry == null || expiry.toInstant().isBefore(Instant.now())) {
                throw new IllegalArgumentException("Refresh token expired");
            }

            long userID = Long.parseLong(signedJWT.getJWTClaimsSet().getSubject());
            String jti = signedJWT.getJWTClaimsSet().getJWTID();

            RefreshToken session = tokenService.findRefreshByJti(jti);
            if (session == null) {
                throw new IllegalArgumentException("Refresh token not found or already used");
            }

            if (session.getUserId() != userID) {
                throw new IllegalArgumentException("Token does not belong to this user");
            }

            User user = userRepository.findByIdWithUserRoles(userID)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            List<String> roles = user.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .toList();

            String newAccessToken = jwtService.generateAccessToken(user.getId(), roles);

            tokenService.deleteRefreshToken(jti);
            TokenPayload newRefreshToken = jwtService.generateRefreshToken(userID);
            tokenService.saveRefreshToken(
                    newRefreshToken.jti(), userID, newRefreshToken.expiration());

            return AuthenticationResponse.builder()
                    .userId(user.getId())
                    .firstName(user.getFirstName())
                    .lastName(user.getLastName())
                    .accessToken(newAccessToken)
                    .refreshToken(newRefreshToken.tokenValue())
                    .build();

        } catch (ParseException | JOSEException e) {
            throw new RuntimeException("Unauthorized: Refresh token is invalid");
        }
    }

    /**
     * Thứ tự: xóa refresh Redis trước, blacklist access sau.
     * Nếu Redis lỗi giữa chừng, thà access còn sống tối đa ~1h ít rủi ro hơn refresh 14 ngày vẫn dùng được.
     */
    public void logOut(String accessToken, String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            var payloadRefresh = jwtService.validateToken(refreshToken, TokenType.REFRESH);
            tokenService.deleteRefreshToken(payloadRefresh.jti());
        }

        var payloadAccess = jwtService.validateToken(accessToken, TokenType.ACCESS);
        tokenService.blacklistAccessToken(
                payloadAccess.jti(),
                payloadAccess.userId(),
                payloadAccess.expiration());
    }
}
