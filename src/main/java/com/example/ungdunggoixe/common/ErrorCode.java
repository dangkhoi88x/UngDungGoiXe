package com.example.ungdunggoixe.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    // ── User errors ──────────────────────────
    USER_NOT_FOUND(1001, "User not found", HttpStatus.NOT_FOUND),
    EMAIL_ALREADY_EXISTS(1002, "Email already exists", HttpStatus.CONFLICT),
  
    DOCUMENT_SUBMISSION_INVALID(1003, "Vui lòng gửi đầy đủ CMND/CCCD, số GPLX và ảnh hai mặt GPLX (JPEG/PNG/WebP).", HttpStatus.BAD_REQUEST),
    LICENSE_ALREADY_VERIFIED(1004, "GPLX đã được xác minh. Liên hệ admin nếu cần cập nhật.", HttpStatus.CONFLICT),
    PROFILE_UPDATE_INVALID(1005, "Họ hoặc tên không hợp lệ.", HttpStatus.BAD_REQUEST),
    BOOTSTRAP_ADMIN_DISABLED(1006, "Tạo admin qua API đang tắt. Cấu hình app.bootstrap-admin-secret (hoặc biến BOOTSTRAP_ADMIN_SECRET).", HttpStatus.FORBIDDEN),
    BOOTSTRAP_ADMIN_ROLE_INVALID(1007, "role phải là ADMIN hoặc SUPER_ADMIN.", HttpStatus.BAD_REQUEST),
    BOOTSTRAP_ADMIN_BODY_INVALID(1008, "Vui lòng gửi đủ email, mật khẩu, họ và tên.", HttpStatus.BAD_REQUEST),
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
    BOOKING_DEPOSIT_REQUIRED(4007, "Cần thu cọc (tiền mặt tại trạm) trước khi xác nhận booking.", HttpStatus.BAD_REQUEST),
    // ── Payment errors ────────────────────────
    PAYMENT_NOT_FOUND(5001, "Payment not found", HttpStatus.NOT_FOUND),
    PAYMENT_METHOD_NOT_ALLOWED(5002, "Thanh toán tại trạm chỉ dùng tiền mặt (CASH).", HttpStatus.BAD_REQUEST),
    PAYMENT_AMOUNT_INVALID(5003, "Số tiền thanh toán không hợp lệ.", HttpStatus.BAD_REQUEST),
    PAYMENT_STATUS_INVALID(5004, "Trạng thái thanh toán không cho phép thao tác này.", HttpStatus.BAD_REQUEST),
    PAYMENT_BOOKING_NOT_PAYABLE(5005, "Booking không ở trạng thái cho phép ghi nhận thanh toán.", HttpStatus.BAD_REQUEST),
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
