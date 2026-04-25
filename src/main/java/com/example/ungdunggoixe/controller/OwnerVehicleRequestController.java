package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.request.CreateOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.request.UpdateOwnerVehicleRequest;
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
@RequestMapping("/owner/vehicle-requests")
@RequiredArgsConstructor
public class OwnerVehicleRequestController {
    private final OwnerVehicleRequestService ownerVehicleRequestService;
    private final I18nService i18nService;

    @PreAuthorize("isAuthenticated()")
    @PostMapping
    @Operation(summary = "Tao yeu cau chu xe", description = "Nguoi dung gui yeu cau dang ky tro thanh chu xe.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Tao yeu cau thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Du lieu yeu cau khong hop le"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Chua dang nhap")
    })
    public ApiResponse<OwnerVehicleRequestResponse> create(@RequestBody CreateOwnerVehicleRequest request) {
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
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Lay danh sach yeu cau thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Chua dang nhap")
    })
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
    @GetMapping("/{id}")
    @Operation(summary = "Lay chi tiet yeu cau cua toi", description = "Lay chi tiet yeu cau chu xe theo id cua user hien tai.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Lay chi tiet yeu cau thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Chua dang nhap"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Khong tim thay yeu cau")
    })
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
    @PutMapping("/{id}")
    @Operation(summary = "Cap nhat yeu cau chu xe", description = "Cap nhat yeu cau chu xe khi dang o trang thai cho phep.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Cap nhat yeu cau thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Trang thai yeu cau khong hop le"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Khong tim thay yeu cau")
    })
    public ApiResponse<OwnerVehicleRequestResponse> update(@PathVariable Long id,
                                                           @RequestBody UpdateOwnerVehicleRequest request) {
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
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Gui lai yeu cau thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Khong the gui lai o trang thai hien tai"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Khong tim thay yeu cau")
    })
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
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Huy yeu cau thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Khong the huy o trang thai hien tai"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Khong tim thay yeu cau")
    })
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
