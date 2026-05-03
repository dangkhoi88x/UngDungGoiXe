package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.exception.AppException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Duration;
import java.util.Collections;

@Service
@Slf4j
public class GoogleOAuthService {

    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";

    /** Token JSON is small; avoid requiring an {@code ObjectMapper} bean (not always registered with webmvc). */
    private static final ObjectMapper JSON = new ObjectMapper();

    @Value("${oauth2.google.client-id:}")
    private String clientId;

    @Value("${oauth2.google.client-secret:}")
    private String clientSecret;

    public GoogleIdToken.Payload verifyAuthorizationCode(String code, String redirectUri) {
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            throw new AppException(ErrorCode.GOOGLE_OAUTH_NOT_CONFIGURED);
        }
        String body = exchangeAuthorizationCode(code.trim(), redirectUri.trim());
        try {
            JsonNode root = JSON.readTree(body);
            String idTokenStr = root.path("id_token").asText(null);
            if (idTokenStr == null || idTokenStr.isBlank()) {
                log.warn("Google token response missing id_token (status body length={})", body.length());
                throw new AppException(ErrorCode.GOOGLE_TOKEN_EXCHANGE_FAILED);
            }
            return verifyIdToken(idTokenStr);
        } catch (IOException e) {
            log.warn("Failed to parse Google token JSON", e);
            throw new AppException(ErrorCode.GOOGLE_TOKEN_EXCHANGE_FAILED);
        }
    }

    private String exchangeAuthorizationCode(String code, String redirectUri) {
        String form =
                "code="
                        + urlEncode(code)
                        + "&client_id="
                        + urlEncode(clientId)
                        + "&client_secret="
                        + urlEncode(clientSecret)
                        + "&redirect_uri="
                        + urlEncode(redirectUri)
                        + "&grant_type="
                        + urlEncode("authorization_code");
        try {
            HttpClient http = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(TOKEN_URL))
                    .timeout(Duration.ofSeconds(20))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200) {
                log.warn("Google token endpoint HTTP {} body snippet: {}", res.statusCode(), truncate(res.body(), 400));
                throw new AppException(ErrorCode.GOOGLE_TOKEN_EXCHANGE_FAILED);
            }
            return res.body();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Google token exchange interrupted", e);
            throw new AppException(ErrorCode.GOOGLE_TOKEN_EXCHANGE_FAILED);
        } catch (IOException e) {
            log.warn("Google token exchange failed", e);
            throw new AppException(ErrorCode.GOOGLE_TOKEN_EXCHANGE_FAILED);
        }
    }

    private GoogleIdToken.Payload verifyIdToken(String idTokenStr) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                            new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(clientId))
                    .build();
            GoogleIdToken idToken = verifier.verify(idTokenStr);
            if (idToken == null) {
                throw new AppException(ErrorCode.GOOGLE_ID_TOKEN_INVALID);
            }
            return idToken.getPayload();
        } catch (GeneralSecurityException | IOException e) {
            log.warn("Google id_token verification failed", e);
            throw new AppException(ErrorCode.GOOGLE_ID_TOKEN_INVALID);
        }
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
