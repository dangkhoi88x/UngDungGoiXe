package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.service.I18nService;
import com.example.ungdunggoixe.service.OwnerVehicleMediaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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

    private final OwnerVehicleMediaService ownerVehicleMediaService;
    private final I18nService i18nService;

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
    @Operation(summary = "Upload anh xe", description = "Tai len anh xe len Cloudinary (folder owner-vehicles/{userId}/photos).")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Upload anh xe thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "File anh khong hop le"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Chua dang nhap")
    })
    public ApiResponse<Map<String, String>> uploadOwnerVehiclePhoto(
            @RequestParam("file") MultipartFile file
    ) {
        String url = ownerVehicleMediaService.storePhoto(currentUserId(), file);
        return ApiResponse.<Map<String, String>>builder()
                .status("success")
                .message(i18nService.getMessage("response.upload.owner_vehicle_photo.success"))
                .data(Map.of("url", url))
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping("/owner-vehicle/document")
    @Operation(summary = "Upload tai lieu xe", description = "Tai len tai lieu len Cloudinary (folder owner-vehicles/{userId}/documents; PDF = raw).")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Upload tai lieu thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "File tai lieu khong hop le"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Chua dang nhap")
    })
    public ApiResponse<Map<String, String>> uploadOwnerVehicleDocument(
            @RequestParam("file") MultipartFile file
    ) {
        String url = ownerVehicleMediaService.storeDocument(currentUserId(), file);
        return ApiResponse.<Map<String, String>>builder()
                .status("success")
                .message(i18nService.getMessage("response.upload.owner_vehicle_document.success"))
                .data(Map.of("url", url))
                .timestamp(Instant.now())
                .build();
    }
}

