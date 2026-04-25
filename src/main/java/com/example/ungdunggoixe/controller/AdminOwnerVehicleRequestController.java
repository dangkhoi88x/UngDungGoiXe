package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.common.OwnerVehicleRequestStatus;
import com.example.ungdunggoixe.dto.request.AdminReviewOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.OwnerVehicleRequestResponse;
import com.example.ungdunggoixe.service.I18nService;
import com.example.ungdunggoixe.service.OwnerVehicleRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @GetMapping
    @Operation(summary = "Admin lay danh sach yeu cau chu xe", description = "Lay danh sach yeu cau chu xe theo trang thai.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Lay danh sach yeu cau thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Chua dang nhap"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Khong du quyen")
    })
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

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @GetMapping("/{id}")
    @Operation(summary = "Admin lay chi tiet yeu cau", description = "Lay chi tiet yeu cau chu xe theo id.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Lay chi tiet yeu cau thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Khong tim thay yeu cau")
    })
    public ApiResponse<OwnerVehicleRequestResponse> getAdminRequestById(@PathVariable Long id) {
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.getAdminRequestById(id);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.owner_vehicle_request.get_by_id.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @PostMapping("/{id}/approve")
    @Operation(summary = "Admin phe duyet yeu cau", description = "Phe duyet yeu cau chu xe.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Phe duyet yeu cau thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Trang thai yeu cau khong hop le"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Khong tim thay yeu cau")
    })
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

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @PostMapping("/{id}/reject")
    @Operation(summary = "Admin tu choi yeu cau", description = "Tu choi yeu cau chu xe.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Tu choi yeu cau thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Trang thai yeu cau khong hop le"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Khong tim thay yeu cau")
    })
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

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @PostMapping("/{id}/need-more-info")
    @Operation(summary = "Admin yeu cau bo sung", description = "Danh dau yeu cau chu xe can bo sung thong tin.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Danh dau bo sung thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Trang thai yeu cau khong hop le"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Khong tim thay yeu cau")
    })
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
