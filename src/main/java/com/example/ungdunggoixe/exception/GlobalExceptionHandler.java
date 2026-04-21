package com.example.ungdunggoixe.exception;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Dùng setter thay vì {@code ApiResponse.builder().code(...)} để tránh {@link NoSuchMethodError}
     * khi bytecode builder (int vs {@link Integer}) hoặc bản biên dịch cũ/mới lệch nhau.
     */
    private static ApiResponse<Void> errorBody(int code, String message) {
        ApiResponse<Void> r = new ApiResponse<>();
        r.setStatus("error");
        r.setData(null);
        r.setCode(code);
        r.setMessage(message);
        r.setTimestamp(Instant.now());
        return r;
    }

    // Bắt AppException (lỗi do mình tự throw)
    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(AppException e) {
        ErrorCode errorCode = e.getErrorCode();
        ApiResponse<Void> response = errorBody(errorCode.getCode(),
                errorCode.getMessage());
        return ResponseEntity.status(errorCode.getHttpStatus()).body(response);
    }

    /** Sai mật khẩu hoặc không có user (Spring ẩn "user not found" thành bad credentials). */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException e) {
        ApiResponse<Void> response =
                errorBody(ErrorCode.UNAUTHORIZED.getCode(), "Email hoặc mật khẩu không đúng.");
        return ResponseEntity.status(ErrorCode.UNAUTHORIZED.getHttpStatus()).body(response);
    }

    /**
     * Lỗi khi load user (ví dụ JDBC: thiếu cột bảng users, DB lỗi). Không phải sai mật khẩu.
     */
    @ExceptionHandler(InternalAuthenticationServiceException.class)
    public ResponseEntity<ApiResponse<Void>> handleInternalAuthenticationService(InternalAuthenticationServiceException e) {
        Throwable cause = e.getCause() != null ? e.getCause() : e;
        String detail = cause.getMessage() != null ? cause.getMessage() : e.getMessage();
        ApiResponse<Void> response =
                errorBody(ErrorCode.INTERNAL_ERROR.getCode(), "Lỗi đăng nhập (hệ thống): " + detail);
        return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.getHttpStatus()).body(response);
    }

    // Bắt tất cả lỗi không mong muốn còn lại
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        // In lỗi thật ra console để debug
        e.printStackTrace();
        ApiResponse<Void> response =
                errorBody(
                        ErrorCode.INTERNAL_ERROR.getCode(),
                        ErrorCode.INTERNAL_ERROR.getMessage() + ": " + e.getMessage());
        return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.getHttpStatus()).body(response);
    }
}
