package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.service.I18nService;
import com.example.ungdunggoixe.service.VehicleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
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
            summary = "Upload anh xe (Cloudinary)",
            description = "Admin: moi xe. Chu xe: chi xe da duoc gan qua owner vehicle request (da duyet).")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Upload thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "File khong hop le"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Chua dang nhap"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Khong du quyen"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Khong tim thay xe")
    })
    public ApiResponse<Map<String, String>> uploadPhoto(
            @PathVariable("id") Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long userId = parseUserId(jwt);
        String url = vehicleService.addVehiclePhoto(id, file, userId, rolesFromJwt(jwt));
        return ApiResponse.<Map<String, String>>builder()
                .status("success")
                .message(i18nService.getMessage("response.vehicle.photo.upload.success"))
                .data(Map.of("url", url))
                .timestamp(Instant.now())
                .build();
    }

    private static Long parseUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        try {
            return Long.parseLong(jwt.getSubject());
        } catch (NumberFormatException ex) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }

    @SuppressWarnings("unchecked")
    private static List<String> rolesFromJwt(Jwt jwt) {
        Object claim = jwt != null ? jwt.getClaim("roles") : null;
        if (claim instanceof List<?> list) {
            return list.stream().map(Object::toString).toList();
        }
        return List.of();
    }
}
