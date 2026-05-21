package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.dto.request.CreateVehicleRequest;
import com.example.ungdunggoixe.dto.request.UpdateVehicleRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.CreateVehicleResponse;
import com.example.ungdunggoixe.dto.response.PageResponse;
import com.example.ungdunggoixe.dto.response.VehiclePublicFeedbackRowResponse;
import com.example.ungdunggoixe.service.I18nService;
import com.example.ungdunggoixe.service.VehiclePublicFeedbackService;
import com.example.ungdunggoixe.service.VehicleService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@RestController
@AllArgsConstructor
@RequestMapping("/vehicles")
public class VehicleController {
    private static final int MAX_PUBLIC_FEEDBACK_PAGE_SIZE = 50;

    private final VehicleService vehicleService;
    private final I18nService i18nService;
    private final VehiclePublicFeedbackService vehiclePublicFeedbackService;

    @PostMapping
    @Operation(summary = "Tao xe", description = "Tao moi thong tin xe trong he thong.")
    public ApiResponse<CreateVehicleResponse> create(@Valid @RequestBody CreateVehicleRequest request) {
        CreateVehicleResponse result = vehicleService.create(request);

        return ApiResponse.<CreateVehicleResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.vehicle.create.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @GetMapping("/paged")
    @Operation(summary = "Lay danh sach xe theo trang", description = "Loc va phan trang danh sach xe cho admin.")
    public ApiResponse<PageResponse<CreateVehicleResponse>> getVehiclesPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) VehicleStatus status,
            @RequestParam(required = false) FuelType fuelType,
            @RequestParam(required = false) String keyword) {
        PageResponse<CreateVehicleResponse> result = vehicleService.getVehiclesPaged(
                page, size, sortBy, sortDir, stationId, status, fuelType, keyword);
        return ApiResponse.<PageResponse<CreateVehicleResponse>>builder()
                .status("success")
                .message(i18nService.getMessage("response.vehicle.page.success"))
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
    @Operation(summary = "Tim kiem xe", description = "Tim kiem xe theo cac bo loc nhu tram, hang xe, suc chua, gia, nhien lieu.")
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
                .message(i18nService.getMessage("response.vehicle.search.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    /**
     * Đánh giá xe công khai (khách đã hoàn tất booking + gửi feedback). Không cần đăng nhập.
     */
    @GetMapping("/{id}/feedback")
    @Operation(summary = "Danh gia cong khai theo xe", description = "Phan trang danh gia sau chuyen hoan tat — hien thi tren trang chi tiet xe.")
    public ApiResponse<PageResponse<VehiclePublicFeedbackRowResponse>> getPublicFeedbackForVehicle(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), MAX_PUBLIC_FEEDBACK_PAGE_SIZE);
        var pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        PageResponse<VehiclePublicFeedbackRowResponse> result =
                vehiclePublicFeedbackService.listForVehicle(id, pageable);
        return ApiResponse.<PageResponse<VehiclePublicFeedbackRowResponse>>builder()
                .status("success")
                .message(i18nService.getMessage("response.vehicle.public_feedback.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lay chi tiet xe", description = "Lay thong tin chi tiet xe theo id.")
    public ApiResponse<CreateVehicleResponse> getById(@PathVariable Long id) {
        CreateVehicleResponse result = vehicleService.getVehicleById(id);
        return ApiResponse.<CreateVehicleResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.vehicle.get_by_id.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cap nhat xe", description = "Cap nhat thong tin xe theo id.")
    public ApiResponse<CreateVehicleResponse> update(@PathVariable Long id, @Valid @RequestBody UpdateVehicleRequest request) {
        CreateVehicleResponse result = vehicleService.updateVehicle(id, request);
        return ApiResponse.<CreateVehicleResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.vehicle.update.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xoa xe", description = "Xoa xe theo id.")
    public String delete(@PathVariable Long id) {
        return vehicleService.deleteVehicle(id);
    }
}
