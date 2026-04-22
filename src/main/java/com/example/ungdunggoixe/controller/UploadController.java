package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.service.LocalOwnerVehicleFileStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final LocalOwnerVehicleFileStorage localOwnerVehicleFileStorage;

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        try {
            return Long.parseLong(auth.getName());
        } catch (NumberFormatException e) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping("/owner-vehicle/photo")
    public ApiResponse<Map<String, String>> uploadOwnerVehiclePhoto(
            @RequestParam("file") MultipartFile file
    ) {
        String url = localOwnerVehicleFileStorage.storePhoto(currentUserId(), file);
        return ApiResponse.<Map<String, String>>builder()
                .status("success")
                .message("Upload owner vehicle photo successful")
                .data(Map.of("url", url))
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping("/owner-vehicle/document")
    public ApiResponse<Map<String, String>> uploadOwnerVehicleDocument(
            @RequestParam("file") MultipartFile file
    ) {
        String url = localOwnerVehicleFileStorage.storeDocument(currentUserId(), file);
        return ApiResponse.<Map<String, String>>builder()
                .status("success")
                .message("Upload owner vehicle document successful")
                .data(Map.of("url", url))
                .timestamp(Instant.now())
                .build();
    }
}

