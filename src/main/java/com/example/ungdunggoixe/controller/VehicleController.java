package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.dto.request.CreateVehicleRequest;
import com.example.ungdunggoixe.dto.request.UpdateVehicleRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.CreateVehicleResponse;
import com.example.ungdunggoixe.dto.response.PagedVehicleResponse;
import com.example.ungdunggoixe.service.VehicleService;
import lombok.AllArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@RestController
@AllArgsConstructor
@RequestMapping("/vehicles")
public class VehicleController {
    private final VehicleService vehicleService;

    @PostMapping
    public ApiResponse<CreateVehicleResponse> create(@RequestBody CreateVehicleRequest request) {
        CreateVehicleResponse result = vehicleService.create(request);

        return ApiResponse.<CreateVehicleResponse>builder()
                .status("success")
                .message("Create vehicle successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @GetMapping("/paged")
    public ApiResponse<PagedVehicleResponse> getVehiclesPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) VehicleStatus status,
            @RequestParam(required = false) FuelType fuelType,
            @RequestParam(required = false) String keyword) {
        PagedVehicleResponse result = vehicleService.getVehiclesPaged(
                page, size, sortBy, sortDir, stationId, status, fuelType, keyword);
        return ApiResponse.<PagedVehicleResponse>builder()
                .status("success")
                .message("Get vehicles page successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    /**
     * Search xe nâng cao:
     * GET /vehicles?stationId=1&brand=Toyota&minCapacity=4&fuelType=GASOLINE&minPrice=50000&maxPrice=200000
     * Tất cả params đều optional.
     */
    @GetMapping
    public ApiResponse<List<CreateVehicleResponse>> searchVehicles(
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) VehicleStatus status,
            @RequestParam(required = false) FuelType fuelType,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice
    ) {
        List<CreateVehicleResponse> result = vehicleService.searchVehicles(stationId, status, fuelType, brand, minCapacity, minPrice, maxPrice);
        return ApiResponse.<List<CreateVehicleResponse>>builder()
                .status("success")
                .message("Search vehicles successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<CreateVehicleResponse> getById(@PathVariable Long id) {
        CreateVehicleResponse result = vehicleService.getVehicleById(id);
        return ApiResponse.<CreateVehicleResponse>builder()
                .status("success")
                .message("Get vehicle successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PutMapping("/{id}")
    public ApiResponse<CreateVehicleResponse> update(@PathVariable Long id, @RequestBody UpdateVehicleRequest request) {
        CreateVehicleResponse result = vehicleService.updateVehicle(id, request);
        return ApiResponse.<CreateVehicleResponse>builder()
                .status("success")
                .message("Update vehicle successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @DeleteMapping("/{id}")
    public String delete(@PathVariable Long id) {
        return vehicleService.deleteVehicle(id);
    }
}
