package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.request.AuthenticationRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.AuthenticationResponse;
import com.example.ungdunggoixe.service.AuthenticationService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthenticationController {
    private final AuthenticationService authenticationService;
    @PostMapping("/login")
    public ApiResponse<AuthenticationResponse> login(@RequestBody AuthenticationRequest authenticationRequest, HttpServletResponse response) {
        var result = authenticationService.authenticate(authenticationRequest);
        ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", result.refreshToken())
                .httpOnly(true)
                .secure(false)// deploy thật thì true
                .path("/")
                .maxAge(3600*24*14)
                .sameSite("Lax")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

       return ApiResponse.<AuthenticationResponse>builder()
               .status("success")
               .message("Login successful")
               .data(AuthenticationResponse.builder()
                       .userId(result.userId())
                       .firstName(result.firstName())
                       .lastName(result.lastName())
                       .accessToken(result.accessToken())
                       .refreshToken(null)
                       .build())
               .timestamp(Instant.now())
               .build();
    }

    @PostMapping("/refresh-token")
    public ApiResponse<AuthenticationResponse> refreshToken(
            @CookieValue(name = "refresh_token") String refreshToken
    ) {
        AuthenticationResponse result = authenticationService.refreshToken(refreshToken);

        return ApiResponse.<AuthenticationResponse>builder()
                .status("success")
                .message("Token refreshed")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }
    @PostMapping("/logout")
    public void logout(
    @RequestHeader("Authorization") String authHeader,
    @CookieValue(name = "refresh_token", required = false) String refreshToken,
    HttpServletResponse response)
    {
        String token = authHeader.replace("Bearer ", "");
        authenticationService.logOut(token, refreshToken);

        ResponseCookie deleteCookie = ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(false) // deploy thật thì true
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, deleteCookie.toString());
    }
}
