package com.example.ungdunggoixe.exception;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.service.I18nService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.stream.Collectors;

@RestControllerAdvice
@RequiredArgsConstructor
@Slf4j
public class GlobalExceptionHandler {

    private final I18nService i18nService;


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

    /**
     * Bean Validation: bắt lỗi từ {@code @Valid @RequestBody} khi DTO có {@code @NotNull}, {@code @NotBlank}, v.v.
     * Gom tất cả field-level errors thành một message dễ đọc.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        ApiResponse<Void> response = errorBody(400, message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
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

    /**
     * Static resources under /files may include old local URLs stored before S3 migration.
     * Return a plain 404 instead of treating missing images/documents as an application error.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(NoResourceFoundException e) {
        ApiResponse<Void> response = errorBody(404, "Resource not found");
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    // Bắt tất cả lỗi không mong muốn còn lại
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error("Unhandled exception caught by GlobalExceptionHandler", e);
        ApiResponse<Void> response =
                errorBody(
                        ErrorCode.INTERNAL_ERROR.getCode(),
                        i18nService.getMessage(ErrorCode.INTERNAL_ERROR.getMessageKey()));
        return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.getHttpStatus()).body(response);
    }
}
