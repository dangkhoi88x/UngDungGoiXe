package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.TokenType;
import com.example.ungdunggoixe.dto.TokenPayload;
import com.example.ungdunggoixe.dto.request.AuthenticationRequest;
import com.example.ungdunggoixe.dto.response.AuthenticationResponse;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.repository.UserRepository;
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
    private final UserRepository userRepository;

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
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();

    }
    public AuthenticationResponse refreshToken(String refreshToken){
            if(refreshToken==null || refreshToken.isEmpty()){
                throw new IllegalArgumentException("Refresh token is empty");
            }
        var tokenPayload = jwtService.validateToken(refreshToken, TokenType.REFRESH);
        var userID= tokenPayload.userId();

        User user = userRepository.findById(userID).orElseThrow(()->new IllegalArgumentException("User not found"));

        List<String> roles = user.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
        String accessToken = jwtService.generateAccessToken(user.getId(),roles);
        return AuthenticationResponse.builder()
                .userId(userID)
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .accessToken(accessToken)
                .build();

    }
}
