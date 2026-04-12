package com.example.ungdunggoixe.exception;

import com.example.ungdunggoixe.common.ErrorCode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor

public class AppException extends RuntimeException {
    private final ErrorCode errorCode;


}
