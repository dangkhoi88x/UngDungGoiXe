package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.common.OwnerVehicleRequestStatus;
import com.example.ungdunggoixe.dto.request.AdminReviewOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.OwnerVehicleRequestResponse;
import com.example.ungdunggoixe.service.OwnerVehicleRequestService;
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

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @GetMapping
    public ApiResponse<List<OwnerVehicleRequestResponse>> getAdminRequests(
            @RequestParam(required = false) OwnerVehicleRequestStatus status
    ) {
        List<OwnerVehicleRequestResponse> result = ownerVehicleRequestService.getAdminRequests(status);
        return ApiResponse.<List<OwnerVehicleRequestResponse>>builder()
                .status("success")
                .message("Get owner vehicle requests successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @GetMapping("/{id}")
    public ApiResponse<OwnerVehicleRequestResponse> getAdminRequestById(@PathVariable Long id) {
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.getAdminRequestById(id);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message("Get owner vehicle request successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @PostMapping("/{id}/approve")
    public ApiResponse<OwnerVehicleRequestResponse> approve(
            @PathVariable Long id,
            @RequestBody(required = false) AdminReviewOwnerVehicleRequest request
    ) {
        String note = request != null ? request.getAdminNote() : null;
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.approve(id, note);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message("Approve owner vehicle request successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @PostMapping("/{id}/reject")
    public ApiResponse<OwnerVehicleRequestResponse> reject(
            @PathVariable Long id,
            @RequestBody(required = false) AdminReviewOwnerVehicleRequest request
    ) {
        String note = request != null ? request.getAdminNote() : null;
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.reject(id, note);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message("Reject owner vehicle request successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @PostMapping("/{id}/need-more-info")
    public ApiResponse<OwnerVehicleRequestResponse> needMoreInfo(
            @PathVariable Long id,
            @RequestBody(required = false) AdminReviewOwnerVehicleRequest request
    ) {
        String note = request != null ? request.getAdminNote() : null;
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.needMoreInfo(id, note);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message("Mark owner vehicle request as need more info successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }
}
