package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.TokenType;
import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.dto.TokenPayload;
import com.example.ungdunggoixe.dto.request.AuthenticationRequest;
import com.example.ungdunggoixe.dto.response.AuthenticationResponse;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.example.ungdunggoixe.entity.RefreshToken;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.repository.UserRepository;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import java.text.ParseException;
import java.time.Instant;
import java.util.Date;
import java.util.List;

public interface AuthenticationService {
    AuthenticationResponse authenticate(AuthenticationRequest request);
    AuthenticationResponse authenticateWithGoogle(String code, String redirectUri);
    AuthenticationResponse refreshToken(String refreshToken);
    void logOut(String accessToken, String refreshToken);
}
