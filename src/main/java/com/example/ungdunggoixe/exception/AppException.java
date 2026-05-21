package com.example.ungdunggoixe.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor

public class AppException extends RuntimeException {
    private final ErrorCode errorCode;


}
