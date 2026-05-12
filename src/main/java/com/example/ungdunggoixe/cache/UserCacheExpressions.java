package com.example.ungdunggoixe.cache;

import org.springframework.security.core.context.SecurityContextHolder;

/**
 * SpEL-callable helpers for Spring Cache keys tied to the current security principal.
 */
public final class UserCacheExpressions {

    /**
     * Use in {@code @Cacheable(key = UserCacheExpressions.CURRENT_PRINCIPAL_NAME)} etc.
     */
    public static final String CURRENT_PRINCIPAL_NAME =
            "T(com.example.ungdunggoixe.cache.UserCacheExpressions).currentPrincipalName()";

    private UserCacheExpressions() {}

    @SuppressWarnings("unused") // invoked from SpEL
    public static String currentPrincipalName() {
        var ctx = SecurityContextHolder.getContext();
        if (ctx == null) {
            return "";
        }
        var auth = ctx.getAuthentication();
        if (auth == null || auth.getName() == null) {
            return "";
        }
        return auth.getName();
    }
}
