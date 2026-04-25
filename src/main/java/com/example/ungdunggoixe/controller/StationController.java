package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.request.CreateStationRequest;
import com.example.ungdunggoixe.dto.request.UpdateStationRequest;
import com.example.ungdunggoixe.common.StationStatus;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.CreateStationResponse;
import com.example.ungdunggoixe.dto.response.PagedStationResponse;
import com.example.ungdunggoixe.dto.response.StationResponse;
import com.example.ungdunggoixe.service.I18nService;
import com.example.ungdunggoixe.service.StationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.AllArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@AllArgsConstructor
@RequestMapping("/stations")
public class StationController {
    private final StationService stationService;
    private final I18nService i18nService;

    @PostMapping
    @Operation(summary = "Tao tram", description = "Tao moi tram xe.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Tao tram thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Ten tram da ton tai")
    })
    public ApiResponse<CreateStationResponse> create(@RequestBody CreateStationRequest request) {
            CreateStationResponse result = stationService.createStation(request);
            return ApiResponse.<CreateStationResponse>builder()
                    .status("success")
                    .message(i18nService.getMessage("response.station.create.success"))
                    .data(result)
                    .timestamp(Instant.now())
                    .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @GetMapping("/paged")
    @Operation(summary = "Lay danh sach tram theo trang", description = "Loc va phan trang danh sach tram cho admin.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Lay danh sach tram theo trang thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Chua dang nhap"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Khong du quyen")
    })
    public ApiResponse<PagedStationResponse> getStationsPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) StationStatus status,
            @RequestParam(required = false) String keyword) {
        PagedStationResponse result = stationService.getStationsPaged(
                page, size, sortBy, sortDir, status, keyword);
        return ApiResponse.<PagedStationResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.station.page.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lay chi tiet tram", description = "Lay thong tin tram theo id.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Lay chi tiet tram thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Khong tim thay tram")
    })
    public ApiResponse<StationResponse> getbyID(@PathVariable Long id){
        StationResponse result = stationService.getStationbyID(id);
        return ApiResponse.<StationResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.station.get_by_id.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }
    @GetMapping
    @Operation(summary = "Lay tat ca tram", description = "Lay danh sach tat ca tram.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Lay tat ca tram thanh cong")
    })
    public ApiResponse<List<StationResponse>> getAll(){
        List<StationResponse> result = stationService.getAllStation();
        return ApiResponse.<List<StationResponse>>builder()
                .status("success")
                .message(i18nService.getMessage("response.station.get_all.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }
    @PutMapping("/{id}")
    @Operation(summary = "Cap nhat tram", description = "Cap nhat thong tin tram theo id.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Cap nhat tram thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Khong tim thay tram")
    })
    public ApiResponse<StationResponse> update(@PathVariable Long id, @RequestBody UpdateStationRequest request) {
        StationResponse result = stationService.updateStation(id, request);
        return ApiResponse.<StationResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.station.update.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xoa tram", description = "Soft delete tram bang cach chuyen trang thai INACTIVE.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Xoa tram thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Khong tim thay tram")
    })
    public String delete(@PathVariable Long id) {
        return stationService.deleteStation(id);
    }
}
