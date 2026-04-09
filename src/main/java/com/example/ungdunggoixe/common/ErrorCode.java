package com.example.ungdunggoixe.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    // ── User errors ──────────────────────────
    USER_NOT_FOUND(1001, "User not found", HttpStatus.NOT_FOUND),
    EMAIL_ALREADY_EXISTS(1002, "Email already exists", HttpStatus.CONFLICT),
    // ── Station errors ────────────────────────
    STATION_NOT_FOUND(2001, "Station not found", HttpStatus.NOT_FOUND),
    STATION_NAME_ALREADY_EXISTS(2002, "Station name already exists", HttpStatus.CONFLICT),
    // ── Vehicle errors ────────────────────────
    VEHICLE_NOT_FOUND(3001, "Vehicle not found", HttpStatus.NOT_FOUND),
    VEHICLE_LICENSE_PLATE_ALREADY_EXISTS(3002, "Vehicle license plate already exists", HttpStatus.CONFLICT),
    // ── Generic errors ────────────────────────
    UNAUTHORIZED(9001, "Unauthorized", HttpStatus.UNAUTHORIZED),
    FORBIDDEN(9002, "Forbidden", HttpStatus.FORBIDDEN),
    INTERNAL_ERROR(9999, "Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
    private final int code;
    private final String message;
    private final HttpStatus httpStatus;
    ErrorCode(int code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}
