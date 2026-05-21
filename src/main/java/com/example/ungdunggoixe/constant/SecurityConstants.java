package com.example.ungdunggoixe.constant;

import java.util.Set;

public final class SecurityConstants {
    private SecurityConstants() {
    }

    /**
     * ROLE_ADMIN_ and ROLE_SUPER_ADMIN_ are kept for backward compatibility with old tokens.
     */
    public static final Set<String> ADMIN_AUTHORITIES = Set.of(
            "ROLE_ADMIN",
            "ROLE_ADMIN_",
            "ROLE_SUPER_ADMIN",
            "ROLE_SUPER_ADMIN_"
    );
}
