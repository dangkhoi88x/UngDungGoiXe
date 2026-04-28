package com.example.ungdunggoixe.exception;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.service.I18nService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final I18nService i18nService;

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
                i18nService.getMessage(errorCode.getMessageKey()));
        return ResponseEntity.status(errorCode.getHttpStatus()).body(response);
    }

    /** Sai mật khẩu hoặc không có user (Spring ẩn "user not found" thành bad credentials). */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException e) {
        ApiResponse<Void> response =
                errorBody(ErrorCode.UNAUTHORIZED.getCode(), i18nService.getMessage("error.auth.bad_credentials"));
        return ResponseEntity.status(ErrorCode.UNAUTHORIZED.getHttpStatus()).body(response);
    }

    /**
     * Lỗi khi load user (ví dụ JDBC: thiếu cột bảng users, DB lỗi). Không phải sai mật khẩu.
     */
    @ExceptionHandler(InternalAuthenticationServiceException.class)
    public ResponseEntity<ApiResponse<Void>> handleInternalAuthenticationService(InternalAuthenticationServiceException e) {
        ApiResponse<Void> response =
                errorBody(ErrorCode.INTERNAL_ERROR.getCode(), i18nService.getMessage("error.auth.login_system"));
        return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.getHttpStatus()).body(response);
    }

    /**
     * Lỗi phân quyền (403) từ Spring Security/@PreAuthorize.
     * Trả response gọn để tránh rơi xuống handler tổng quát và in stacktrace dài.
     */
    @ExceptionHandler({AccessDeniedException.class, AuthorizationDeniedException.class})
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(Exception e) {
        ApiResponse<Void> response =
                errorBody(ErrorCode.FORBIDDEN.getCode(), i18nService.getMessage(ErrorCode.FORBIDDEN.getMessageKey()));
        return ResponseEntity.status(ErrorCode.FORBIDDEN.getHttpStatus()).body(response);
    }

    // Bắt tất cả lỗi không mong muốn còn lại
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        // In lỗi thật ra console để debug
        e.printStackTrace();
        ApiResponse<Void> response =
                errorBody(
                        ErrorCode.INTERNAL_ERROR.getCode(),
                        i18nService.getMessage(ErrorCode.INTERNAL_ERROR.getMessageKey()));
        return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.getHttpStatus()).body(response);
    }
}
