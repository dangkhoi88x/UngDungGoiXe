package com.example.ungdunggoixe.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    // ── User errors ──────────────────────────
    USER_NOT_FOUND(1001, "error.user.not_found", "User not found", HttpStatus.NOT_FOUND),
    EMAIL_ALREADY_EXISTS(1002, "error.user.email_already_exists", "Email already exists", HttpStatus.CONFLICT),
  
    DOCUMENT_SUBMISSION_INVALID(1003, "error.user.document_submission_invalid", "Please provide identity number, license number and both license images (JPEG/PNG/WebP).", HttpStatus.BAD_REQUEST),
    LICENSE_ALREADY_VERIFIED(1004, "error.user.license_already_verified", "License is already verified. Contact admin if an update is needed.", HttpStatus.CONFLICT),
    PROFILE_UPDATE_INVALID(1005, "error.user.profile_update_invalid", "First name or last name is invalid.", HttpStatus.BAD_REQUEST),
    BOOTSTRAP_ADMIN_DISABLED(1006, "error.user.bootstrap_admin_disabled", "Bootstrap admin API is disabled. Configure app.bootstrap-admin-secret (or BOOTSTRAP_ADMIN_SECRET).", HttpStatus.FORBIDDEN),
    BOOTSTRAP_ADMIN_ROLE_INVALID(1007, "error.user.bootstrap_admin_role_invalid", "Role must be ADMIN or SUPER_ADMIN.", HttpStatus.BAD_REQUEST),
    BOOTSTRAP_ADMIN_BODY_INVALID(1008, "error.user.bootstrap_admin_body_invalid", "Please provide email, password, first name and last name.", HttpStatus.BAD_REQUEST),
    AUTHENTICATION_MISSING(1009, "error.auth.authentication_missing", "Authentication is missing.", HttpStatus.UNAUTHORIZED),
    // ── Station errors ────────────────────────
    STATION_NOT_FOUND(2001, "error.station.not_found", "Station not found", HttpStatus.NOT_FOUND),
    STATION_NAME_ALREADY_EXISTS(2002, "error.station.name_already_exists", "Station name already exists", HttpStatus.CONFLICT),
    STATION_INACTIVE(2003, "error.station.inactive", "Station is inactive, cannot create booking", HttpStatus.BAD_REQUEST),
    // ── Vehicle errors ────────────────────────
    VEHICLE_NOT_FOUND(3001, "error.vehicle.not_found", "Vehicle not found", HttpStatus.NOT_FOUND),
    VEHICLE_LICENSE_PLATE_ALREADY_EXISTS(3002, "error.vehicle.license_plate_already_exists", "Vehicle license plate already exists", HttpStatus.CONFLICT),
    OWNER_VEHICLE_REQUEST_NOT_FOUND(3003, "error.owner_vehicle_request.not_found", "Owner vehicle request not found", HttpStatus.NOT_FOUND),
    OWNER_VEHICLE_REQUEST_STATUS_INVALID(3004, "error.owner_vehicle_request.status_invalid", "Owner vehicle request status transition is invalid", HttpStatus.BAD_REQUEST),
    OWNER_VEHICLE_REQUEST_INVALID(3005, "error.owner_vehicle_request.invalid", "Owner vehicle request data is invalid", HttpStatus.BAD_REQUEST),
    OWNER_VEHICLE_REQUEST_PHOTOS_INSUFFICIENT(
            3006,
            "error.owner_vehicle_request.photos_insufficient",
            "At least 3 vehicle photos are required (non-empty URLs).",
            HttpStatus.BAD_REQUEST),
    OWNER_VEHICLE_REQUEST_DOCS_REQUIRED(
            3007,
            "error.owner_vehicle_request.docs_required",
            "Vehicle registration and insurance URLs are required.",
            HttpStatus.BAD_REQUEST),
    FILE_UPLOAD_INVALID(3008, "error.file_upload.invalid", "Invalid uploaded file.", HttpStatus.BAD_REQUEST),
    FILE_UPLOAD_TOO_LARGE(3009, "error.file_upload.too_large", "Uploaded file exceeds allowed size.", HttpStatus.BAD_REQUEST),
    OWNER_VEHICLE_REQUEST_PHOTOS_TOO_MANY(
            3010,
            "error.owner_vehicle_request.photos_too_many",
            "Too many vehicle photos.",
            HttpStatus.BAD_REQUEST),
    VEHICLE_POLICY_INVALID(3011, "error.vehicle.policy_invalid", "Vehicle policy is invalid.", HttpStatus.BAD_REQUEST),
    // ── Booking errors ────────────────────────
    BOOKING_NOT_FOUND(4001, "error.booking.not_found", "Booking not found", HttpStatus.NOT_FOUND),
    BOOKING_CODE_ALREADY_EXISTS(4002, "error.booking.code_already_exists", "Booking code already exists", HttpStatus.CONFLICT),
    BOOKING_TIME_INVALID(4003, "error.booking.time_invalid", "Booking time is invalid", HttpStatus.BAD_REQUEST),
    VEHICLE_NOT_AVAILABLE(4004, "error.vehicle.not_available", "Vehicle is not available for the requested time range", HttpStatus.CONFLICT),
    BOOKING_STATUS_TRANSITION_INVALID(4005, "error.booking.status_transition_invalid", "Invalid booking status transition", HttpStatus.BAD_REQUEST),
    VEHICLE_NOT_IN_CORRECT_STATUS(4006, "error.vehicle.status_incorrect", "Vehicle is not in the correct status for this operation", HttpStatus.CONFLICT),
    BOOKING_DEPOSIT_REQUIRED(4007, "error.booking.deposit_required", "A station cash deposit is required before confirming booking.", HttpStatus.BAD_REQUEST),
    // ── Payment errors ────────────────────────
    PAYMENT_NOT_FOUND(5001, "error.payment.not_found", "Payment not found", HttpStatus.NOT_FOUND),
    PAYMENT_METHOD_NOT_ALLOWED(5002, "error.payment.method_not_allowed", "Station payment only supports CASH method.", HttpStatus.BAD_REQUEST),
    PAYMENT_AMOUNT_INVALID(5003, "error.payment.amount_invalid", "Invalid payment amount.", HttpStatus.BAD_REQUEST),
    PAYMENT_STATUS_INVALID(5004, "error.payment.status_invalid", "Current payment status does not allow this operation.", HttpStatus.BAD_REQUEST),
    PAYMENT_BOOKING_NOT_PAYABLE(5005, "error.payment.booking_not_payable", "Booking is not in a payable status.", HttpStatus.BAD_REQUEST),
    MOMO_REQUEST_TYPE_INVALID(5006, "error.momo.request_type_invalid", "Unsupported MoMo requestType for create payment.", HttpStatus.BAD_REQUEST),
    PAYMENT_MOMO_PREPAY_AMOUNT_RANGE(5007, "error.payment.momo_prepay_amount_range", "MoMo prepay amount outside allowed VND range.", HttpStatus.BAD_REQUEST),
    MOMO_GATEWAY_REJECTED(5008, "error.momo.gateway_rejected", "MoMo payment gateway rejected the create request.", HttpStatus.BAD_REQUEST),
    // ── Blog errors ───────────────────────────
    BLOG_POST_NOT_FOUND(6001, "error.blog_post.not_found", "Blog post not found", HttpStatus.NOT_FOUND),
    BLOG_POST_SLUG_ALREADY_EXISTS(6002, "error.blog_post.slug_already_exists", "Blog slug already exists", HttpStatus.CONFLICT),
    BLOG_POST_BODY_INVALID(6003, "error.blog_post.body_invalid", "Blog post body is invalid", HttpStatus.BAD_REQUEST),
    BLOG_POST_PUBLISH_INVALID(6004, "error.blog_post.publish_invalid", "Cannot publish blog post in current state", HttpStatus.BAD_REQUEST),
    // ── Generic errors ────────────────────────
    UNAUTHORIZED(9001, "error.auth.unauthorized", "Unauthorized", HttpStatus.UNAUTHORIZED),
    FORBIDDEN(9002, "error.auth.forbidden", "Forbidden", HttpStatus.FORBIDDEN),
    INTERNAL_ERROR(9999, "error.common.internal", "Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
    private final int code;
    private final String messageKey;
    private final String message;
    private final HttpStatus httpStatus;
    ErrorCode(int code, String messageKey, String message, HttpStatus httpStatus) {
        this.code = code;
        this.messageKey = messageKey;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}
