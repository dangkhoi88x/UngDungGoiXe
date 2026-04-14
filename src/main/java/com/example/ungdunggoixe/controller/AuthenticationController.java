package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.request.AuthenticationRequest;
import com.example.ungdunggoixe.dto.response.AuthenticationResponse;
import com.example.ungdunggoixe.service.AuthenticationService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthenticationController {
    private final AuthenticationService authenticationService;
    @PostMapping("/login")
    public AuthenticationResponse login(@RequestBody AuthenticationRequest authenticationRequest, HttpServletResponse response) {
        var result = authenticationService.authenticate(authenticationRequest);
        Cookie cookie = new Cookie("refresh_token",result.accessToken());
        cookie.setPath("/");
        cookie.setDomain("localhost");
        cookie.setMaxAge(3600 *24 *14);
        cookie.setSecure(false); // doi thanh true khi deploy - ma hoa phan quyen
        response.addCookie(cookie);

      // result.refreshToken ==null;
        return result;

    }

    @PostMapping("/refresh-token")
    public AuthenticationResponse refreshToken(@CookieValue(name = "refresh_token") String refreshToken) {
        return authenticationService.refreshToken(refreshToken);

    }
    @PostMapping("/logout")
    public void logout(@RequestHeader("Authorization") String authHeader,HttpServletResponse response) {
        String token = authHeader.replace("Bearer ", "");
        authenticationService.logOut(token);
        response.addCookie(new Cookie("refresh_token",null));
    }
}
