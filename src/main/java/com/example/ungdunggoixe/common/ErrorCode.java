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
    STATION_INACTIVE(2003, "Station is inactive, cannot create booking", HttpStatus.BAD_REQUEST),
    // ── Vehicle errors ────────────────────────
    VEHICLE_NOT_FOUND(3001, "Vehicle not found", HttpStatus.NOT_FOUND),
    VEHICLE_LICENSE_PLATE_ALREADY_EXISTS(3002, "Vehicle license plate already exists", HttpStatus.CONFLICT),
    // ── Booking errors ────────────────────────
    BOOKING_NOT_FOUND(4001, "Booking not found", HttpStatus.NOT_FOUND),
    BOOKING_CODE_ALREADY_EXISTS(4002, "Booking code already exists", HttpStatus.CONFLICT),
    BOOKING_TIME_INVALID(4003, "Booking time is invalid", HttpStatus.BAD_REQUEST),
    VEHICLE_NOT_AVAILABLE(4004, "Vehicle is not available for the requested time range", HttpStatus.CONFLICT),
    BOOKING_STATUS_TRANSITION_INVALID(4005, "Invalid booking status transition", HttpStatus.BAD_REQUEST),
    VEHICLE_NOT_IN_CORRECT_STATUS(4006, "Vehicle is not in the correct status for this operation", HttpStatus.CONFLICT),
    // ── Payment errors ────────────────────────
    PAYMENT_NOT_FOUND(5001, "Payment not found", HttpStatus.NOT_FOUND),
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
