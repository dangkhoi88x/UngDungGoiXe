package com.example.ungdunggoixe.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;

public interface GoogleOAuthService {
    GoogleIdToken.Payload verifyAuthorizationCode(String code, String redirectUri);
}
