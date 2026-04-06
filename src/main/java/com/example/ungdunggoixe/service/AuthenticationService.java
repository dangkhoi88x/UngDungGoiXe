package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.dto.request.AuthenticationRequest;
import com.example.ungdunggoixe.dto.response.AuthenticationResponse;
import com.example.ungdunggoixe.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthenticationResponse authenticate(AuthenticationRequest authenticationRequest){
        UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken
                (authenticationRequest.email(),authenticationRequest.password());
        Authentication authentication = this.authenticationManager.authenticate(authenticationToken);
        var user = (User) authentication.getPrincipal();

        Collection<? extends GrantedAuthority> grantedAuthorities = user.getAuthorities();
        List<String> Roles= grantedAuthorities.stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        String accessToken = jwtService.generateAccessToken(user.getId(),Roles);
        String refreshToken = jwtService.generateRefreshToken(user.getId());

        return AuthenticationResponse.builder()
                .userId(user.getId())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();

    }
}
