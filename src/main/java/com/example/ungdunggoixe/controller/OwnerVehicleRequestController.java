package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.request.CreateOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.request.UpdateOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.BookingResponse;
import com.example.ungdunggoixe.dto.response.OwnerRevenueDashboardResponse;
import com.example.ungdunggoixe.dto.response.OwnerVehicleRequestResponse;
import com.example.ungdunggoixe.service.I18nService;
import com.example.ungdunggoixe.service.OwnerVehicleRequestService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/owner/vehicle-requests")
@RequiredArgsConstructor
public class OwnerVehicleRequestController {
    private final OwnerVehicleRequestService ownerVehicleRequestService;
    private final I18nService i18nService;

    @PreAuthorize("isAuthenticated()")
    @PostMapping
    @Operation(summary = "Tao yeu cau chu xe", description = "Nguoi dung gui yeu cau dang ky tro thanh chu xe.")
    public ApiResponse<OwnerVehicleRequestResponse> create(@Valid @RequestBody CreateOwnerVehicleRequest request) {
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.create(request);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.owner_vehicle_request.create.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    @Operation(summary = "Lay danh sach yeu cau cua toi", description = "Lay toan bo yeu cau chu xe cua user hien tai.")
    public ApiResponse<List<OwnerVehicleRequestResponse>> getMyRequests() {
        List<OwnerVehicleRequestResponse> result = ownerVehicleRequestService.getMyRequests();
        return ApiResponse.<List<OwnerVehicleRequestResponse>>builder()
                .status("success")
                .message(i18nService.getMessage("response.owner_vehicle_request.my_list.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/revenue-dashboard")
    @Operation(summary = "Thong ke doanh thu owner", description = "Thong ke doanh thu cac xe da duoc duyet cua owner hien tai.")
    public ApiResponse<OwnerRevenueDashboardResponse> getMyRevenueDashboard() {
        OwnerRevenueDashboardResponse result = ownerVehicleRequestService.getMyRevenueDashboard();
        return ApiResponse.<OwnerRevenueDashboardResponse>builder()
                .status("success")
                .message("Lay thong ke doanh thu owner thanh cong")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    @Operation(summary = "Lay chi tiet yeu cau cua toi", description = "Lay chi tiet yeu cau chu xe theo id cua user hien tai.")
    public ApiResponse<OwnerVehicleRequestResponse> getMyRequestById(@PathVariable Long id) {
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.getMyRequestById(id);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.owner_vehicle_request.get_by_id.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/bookings")
    @Operation(summary = "Lay lich su booking cua xe da duyet", description = "Lay booking cua xe duoc tao tu owner request nay.")
    public ApiResponse<List<BookingResponse>> getMyRequestBookings(@PathVariable Long id) {
        List<BookingResponse> result = ownerVehicleRequestService.getMyApprovedVehicleBookings(id);
        return ApiResponse.<List<BookingResponse>>builder()
                .status("success")
                .message("Lay lich su booking cua xe thanh cong")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("isAuthenticated()")
    @PutMapping("/{id}")
    @Operation(summary = "Cap nhat yeu cau chu xe", description = "Cap nhat yeu cau chu xe khi dang o trang thai cho phep.")
    public ApiResponse<OwnerVehicleRequestResponse> update(@PathVariable Long id,
                                                           @Valid @RequestBody UpdateOwnerVehicleRequest request) {
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.updateMyRequest(id, request);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.owner_vehicle_request.update.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping("/{id}/resubmit")
    @Operation(summary = "Gui lai yeu cau chu xe", description = "Gui lai yeu cau sau khi bi yeu cau bo sung/tu choi.")
    public ApiResponse<OwnerVehicleRequestResponse> resubmit(@PathVariable Long id) {
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.resubmit(id);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.owner_vehicle_request.resubmit.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping("/{id}/cancel")
    @Operation(summary = "Huy yeu cau chu xe", description = "Huy yeu cau chu xe cua user.")
    public ApiResponse<OwnerVehicleRequestResponse> cancel(@PathVariable Long id) {
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.cancel(id);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.owner_vehicle_request.cancel.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }
}
