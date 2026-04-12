package com.example.ungdunggoixe.exception;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    // Bắt AppException (lỗi do mình tự throw)
    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(AppException e) {
        ErrorCode errorCode = e.getErrorCode();
        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .build();
        return ResponseEntity.status(errorCode.getHttpStatus()).body(response);
    }

    /** Sai mật khẩu hoặc không có user (Spring ẩn "user not found" thành bad credentials). */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException e) {
        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .code(ErrorCode.UNAUTHORIZED.getCode())
                .message("Email hoặc mật khẩu không đúng.")
                .build();
        return ResponseEntity.status(ErrorCode.UNAUTHORIZED.getHttpStatus()).body(response);
    }

    /**
     * Lỗi khi load user (ví dụ JDBC: thiếu cột bảng users, DB lỗi). Không phải sai mật khẩu.
     */
    @ExceptionHandler(InternalAuthenticationServiceException.class)
    public ResponseEntity<ApiResponse<Void>> handleInternalAuthenticationService(InternalAuthenticationServiceException e) {
        Throwable cause = e.getCause() != null ? e.getCause() : e;
        String detail = cause.getMessage() != null ? cause.getMessage() : e.getMessage();
        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .code(ErrorCode.INTERNAL_ERROR.getCode())
                .message("Lỗi đăng nhập (hệ thống): " + detail)
                .build();
        return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.getHttpStatus()).body(response);
    }

    // Bắt tất cả lỗi không mong muốn còn lại
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        // In lỗi thật ra console để debug
        e.printStackTrace();
        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .code(ErrorCode.INTERNAL_ERROR.getCode())
                .message(ErrorCode.INTERNAL_ERROR.getMessage() + ": " + e.getMessage())
                .build();
        return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.getHttpStatus()).body(response);
    }
}
