package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.request.AuthenticationRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.AuthenticationResponse;
import com.example.ungdunggoixe.service.AuthenticationService;
import com.example.ungdunggoixe.service.I18nService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthenticationController {

    private static final long REFRESH_MAX_AGE_SECONDS = 3600L * 24 * 14;

    private final AuthenticationService authenticationService;
    private final I18nService i18nService;

    private ResponseCookie buildRefreshCookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from("refresh_token", value)
                .httpOnly(true)
                .secure(false) // deploy thật thì true
                .path("/")
                .maxAge(maxAgeSeconds)
                .sameSite("Lax")
                .build();
    }

    @PostMapping("/login")
    @Operation(summary = "Dang nhap", description = "Dang nhap bang email/mat khau va cap access token + refresh token (cookie).")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Dang nhap thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Thong tin dang nhap khong hop le")
    })
    public ApiResponse<AuthenticationResponse> login(
            @RequestBody AuthenticationRequest request,
            HttpServletResponse response) {

        var result = authenticationService.authenticate(request);
        response.addHeader(
                HttpHeaders.SET_COOKIE,
                buildRefreshCookie(result.refreshToken(), REFRESH_MAX_AGE_SECONDS).toString());

        return ApiResponse.<AuthenticationResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.auth.login.success"))
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
    @Operation(summary = "Lam moi token", description = "Lam moi access token tu refresh token trong cookie refresh_token.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Lam moi token thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Refresh token khong hop le/het han")
    })
    public ApiResponse<AuthenticationResponse> refreshToken(
            @CookieValue(name = "refresh_token") String refreshToken,
            HttpServletResponse response) {

        AuthenticationResponse result = authenticationService.refreshToken(refreshToken);

        if (result.refreshToken() != null) {
            response.addHeader(
                    HttpHeaders.SET_COOKIE,
                    buildRefreshCookie(result.refreshToken(), REFRESH_MAX_AGE_SECONDS).toString());
        }

        return ApiResponse.<AuthenticationResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.auth.refresh.success"))
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

    @PostMapping("/logout")
    @Operation(summary = "Dang xuat", description = "Xoa refresh token va blacklist access token hien tai.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Dang xuat thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Token khong hop le")
    })
    public void logout(
            @RequestHeader("Authorization") String authHeader,
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            HttpServletResponse response) {

        String token = authHeader.replace("Bearer ", "");
        authenticationService.logOut(token, refreshToken);

        response.addHeader(HttpHeaders.SET_COOKIE, buildRefreshCookie("", 0).toString());
    }
}
