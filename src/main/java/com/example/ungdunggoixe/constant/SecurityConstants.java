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
            "ROLE_SUPER_ADMIN_",
            "DASHBOARD_VIEW",
            "USER_MANAGE",
            "VEHICLE_MANAGE",
            "BOOKING_MANAGE",
            "PAYMENT_MANAGE",
            "STATION_MANAGE",
            "BLOG_MANAGE",
            "OWNER_REQUEST_MANAGE"
    );

    public static final String ADMIN_FALLBACK =
            "ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_";

    public static final String CAN_VIEW_DASHBOARD =
            "hasAnyAuthority('DASHBOARD_VIEW', '" + ADMIN_FALLBACK + "')";
    public static final String CAN_MANAGE_USERS =
            "hasAnyAuthority('USER_MANAGE', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')";
    public static final String CAN_MANAGE_VEHICLES =
            "hasAnyAuthority('VEHICLE_MANAGE', '" + ADMIN_FALLBACK + "')";
    public static final String CAN_MANAGE_BOOKINGS =
            "hasAnyAuthority('BOOKING_MANAGE', '" + ADMIN_FALLBACK + "')";
    public static final String CAN_MANAGE_PAYMENTS =
            "hasAnyAuthority('PAYMENT_MANAGE', '" + ADMIN_FALLBACK + "')";
    public static final String CAN_MANAGE_STATIONS =
            "hasAnyAuthority('STATION_MANAGE', '" + ADMIN_FALLBACK + "')";
    public static final String CAN_MANAGE_BLOGS =
            "hasAnyAuthority('BLOG_MANAGE', '" + ADMIN_FALLBACK + "')";
    public static final String CAN_MANAGE_OWNER_REQUESTS =
            "hasAnyAuthority('OWNER_REQUEST_MANAGE', '" + ADMIN_FALLBACK + "')";
}
