package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.TokenType;
import com.example.ungdunggoixe.dto.TokenPayload;
import com.example.ungdunggoixe.dto.request.AuthenticationRequest;
import com.example.ungdunggoixe.dto.response.AuthenticationResponse;
import com.example.ungdunggoixe.entity.Token;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.repository.TokenRepository;
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
import java.util.Collection;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

    @Value("${jwt.secret-key}")
    private String secretKey;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final TokenRepository tokenRepository;
    private final TokenService tokenService;

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
        TokenPayload refreshToken = jwtService.generateRefreshToken(user.getId());

        tokenService.saveToken(refreshToken.jti,user.getId(),refreshToken.expiration());

        return AuthenticationResponse.builder()
                .userId(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .accessToken(accessToken)
                .refreshToken(refreshToken.tokenValue())
                .build();

    }
    public AuthenticationResponse refreshToken(String refreshToken){
            if(refreshToken==null || refreshToken.isEmpty()){
                throw new IllegalArgumentException("Refresh token is empty");
            }
       try{
           SignedJWT signedJWT = SignedJWT.parse(refreshToken);
           boolean isValid = signedJWT.verify(new MACVerifier(secretKey));
           if(!isValid){
               throw new IllegalArgumentException("Invalid refresh token");
           }
           var userID=Long.parseLong(signedJWT.getJWTClaimsSet().getSubject());
           var jti= signedJWT.getJWTClaimsSet().getJWTID();
           Token token =tokenService.findbyJTI(jti);
           if(token==null){
               throw new IllegalArgumentException("Invalid token");
           }


//           var tokenPayload = jwtService.validateToken(refreshToken, TokenType.REFRESH);
//           var userID= tokenPayload.userId();

           User user = userRepository.findByIdWithUserRoles(userID)
                   .orElseThrow(() -> new IllegalArgumentException("User not found"));

           List<String> roles = user.getAuthorities().stream()
                   .map(GrantedAuthority::getAuthority)
                   .toList();
           String accessToken = jwtService.generateAccessToken(user.getId(),roles);
           return AuthenticationResponse.builder()
                   .userId(userID)
                   .firstName(user.getFirstName())
                   .lastName(user.getLastName())
                   .accessToken(accessToken)
                   .refreshToken(null)
                   .build();

       }catch (ParseException | JOSEException e) {
           log.error("Invalid refresh token: {}", e.getMessage());
           throw new RuntimeException("Unauthorized: Refresh token is invalid");
       }
    }
    public void logOut(String accessToken, String refreshToken){
            try{
                var payloadAccess = jwtService.validateToken(accessToken, TokenType.ACCESS);
                var payloadRefresh = jwtService.validateToken(accessToken, TokenType.REFRESH);
                tokenService.saveToken(payloadAccess.jti(), payloadAccess.userId(), payloadAccess.expiration());
                tokenService.deleteToken(payloadRefresh.jti());

            } catch (RuntimeException e) {
                log.error("Invalid token: {}", e.getMessage());
            }
    }
}
