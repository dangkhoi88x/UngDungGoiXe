package com.example.ungdunggoixe.util;

import com.example.ungdunggoixe.constant.JwtConstants;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.exception.ErrorCode;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;

public final class JwtPrincipalUtils {
    private JwtPrincipalUtils() {
    }

    public static Long requireUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        try {
            return Long.parseLong(jwt.getSubject());
        } catch (NumberFormatException ex) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }

    public static List<String> roles(Jwt jwt) {
        Object claim = jwt != null ? jwt.getClaim(JwtConstants.CLAIM_ROLES) : null;
        if (claim instanceof List<?> list) {
            return list.stream().map(Object::toString).toList();
        }
        return List.of();
    }
}
