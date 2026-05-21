package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.service.I18nService;
import com.example.ungdunggoixe.service.VehicleService;
import com.example.ungdunggoixe.util.JwtPrincipalUtils;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping({"/vehicles", "/api/vehicles"})
public class VehiclePhotoController {

    private final VehicleService vehicleService;
    private final I18nService i18nService;

    @PreAuthorize("isAuthenticated()")
    @PostMapping("/{id}/photos")
    @Operation(
            summary = "Upload anh xe (S3)",
            description = "Admin: moi xe. Chu xe: chi xe da duoc gan qua owner vehicle request (da duyet).")
    public ApiResponse<Map<String, String>> uploadPhoto(
            @PathVariable("id") Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long userId = JwtPrincipalUtils.requireUserId(jwt);
        String url = vehicleService.addVehiclePhoto(id, file, userId, JwtPrincipalUtils.roles(jwt));
        return ApiResponse.<Map<String, String>>builder()
                .status("success")
                .message(i18nService.getMessage("response.vehicle.photo.upload.success"))
                .data(Map.of("url", url))
                .timestamp(Instant.now())
                .build();
    }

}
