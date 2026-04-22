package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.request.CreateOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.request.UpdateOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.OwnerVehicleRequestResponse;
import com.example.ungdunggoixe.service.OwnerVehicleRequestService;
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

    @PreAuthorize("isAuthenticated()")
    @PostMapping
    public ApiResponse<OwnerVehicleRequestResponse> create(@RequestBody CreateOwnerVehicleRequest request) {
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.create(request);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message("Create owner vehicle request successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ApiResponse<List<OwnerVehicleRequestResponse>> getMyRequests() {
        List<OwnerVehicleRequestResponse> result = ownerVehicleRequestService.getMyRequests();
        return ApiResponse.<List<OwnerVehicleRequestResponse>>builder()
                .status("success")
                .message("Get my owner vehicle requests successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public ApiResponse<OwnerVehicleRequestResponse> getMyRequestById(@PathVariable Long id) {
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.getMyRequestById(id);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message("Get owner vehicle request successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("isAuthenticated()")
    @PutMapping("/{id}")
    public ApiResponse<OwnerVehicleRequestResponse> update(@PathVariable Long id,
                                                           @RequestBody UpdateOwnerVehicleRequest request) {
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.updateMyRequest(id, request);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message("Update owner vehicle request successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping("/{id}/resubmit")
    public ApiResponse<OwnerVehicleRequestResponse> resubmit(@PathVariable Long id) {
        OwnerVehicleRequestResponse result = ownerVehicleRequestService.resubmit(id);
        return ApiResponse.<OwnerVehicleRequestResponse>builder()
                .status("success")
                .message("Resubmit owner vehicle request successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }
}
