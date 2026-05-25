package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.common.OwnerVehicleRequestStatus;
import com.example.ungdunggoixe.constant.SecurityConstants;
import com.example.ungdunggoixe.dto.request.AdminReviewOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.OwnerVehicleRequestResponse;
import com.example.ungdunggoixe.service.I18nService;
import com.example.ungdunggoixe.service.OwnerVehicleRequestService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/admin/vehicle-requests")
@RequiredArgsConstructor
public class AdminOwnerVehicleRequestController {
    private final OwnerVehicleRequestService ownerVehicleRequestService;
    private final I18nService i18nService;

    @PreAuthorize(SecurityConstants.CAN_MANAGE_OWNER_REQUESTS)
    @GetMapping
    @Operation(summary = "Admin lay danh sach yeu cau chu xe", description = "Lay danh sach yeu cau chu xe theo trang thai.")
    public ApiResponse<List<OwnerVehicleRequestResponse>> getAdminRequests(
            @RequestParam(required = false) OwnerVehicleRequestStatus status
    ) {
        List<OwnerVehicleRequestResponse> result = ownerVehicleRequestService.getAdminRequests(status);
        return ApiResponse.<List<OwnerVehicleRequestResponse>>builder()
                .status("success")
                .message(i18nService.getMessage("response.owner_vehicle_request.admin_list.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize(SecurityConstants.CAN_MANAGE_OWNER_REQUESTS)
    @GetMapping("/{id}")
    @Operation(summary = "Admin lay chi tiet yeu cau", description = "Lay chi tiet yeu cau chu xe theo id.")
    public ApiResponse<OwnerVehicleRequestResponse> getAdminRequestById(@PathVariable Long id) {
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.getAdminRequestById(id);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.owner_vehicle_request.get_by_id.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize(SecurityConstants.CAN_MANAGE_OWNER_REQUESTS)
    @PostMapping("/{id}/approve")
    @Operation(summary = "Admin phe duyet yeu cau", description = "Phe duyet yeu cau chu xe.")
    public ApiResponse<OwnerVehicleRequestResponse> approve(
            @PathVariable Long id,
            @RequestBody(required = false) AdminReviewOwnerVehicleRequest request
    ) {
        String note = request != null ? request.getAdminNote() : null;
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.approve(id, note);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.owner_vehicle_request.approve.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize(SecurityConstants.CAN_MANAGE_OWNER_REQUESTS)
    @PostMapping("/{id}/reject")
    @Operation(summary = "Admin tu choi yeu cau", description = "Tu choi yeu cau chu xe.")
    public ApiResponse<OwnerVehicleRequestResponse> reject(
            @PathVariable Long id,
            @RequestBody(required = false) AdminReviewOwnerVehicleRequest request
    ) {
        String note = request != null ? request.getAdminNote() : null;
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.reject(id, note);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.owner_vehicle_request.reject.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize(SecurityConstants.CAN_MANAGE_OWNER_REQUESTS)
    @PostMapping("/{id}/need-more-info")
    @Operation(summary = "Admin yeu cau bo sung", description = "Danh dau yeu cau chu xe can bo sung thong tin.")
    public ApiResponse<OwnerVehicleRequestResponse> needMoreInfo(
            @PathVariable Long id,
            @RequestBody(required = false) AdminReviewOwnerVehicleRequest request
    ) {
        String note = request != null ? request.getAdminNote() : null;
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.needMoreInfo(id, note);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.owner_vehicle_request.need_more_info.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }
}
