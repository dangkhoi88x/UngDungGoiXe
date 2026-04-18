package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.request.CreateStationRequest;
import com.example.ungdunggoixe.dto.request.UpdateStationRequest;
import com.example.ungdunggoixe.common.StationStatus;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.CreateStationResponse;
import com.example.ungdunggoixe.dto.response.PagedStationResponse;
import com.example.ungdunggoixe.dto.response.StationResponse;
import com.example.ungdunggoixe.service.StationService;
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

    @PostMapping

    public ApiResponse<CreateStationResponse> create(@RequestBody CreateStationRequest request) {
            CreateStationResponse result = stationService.createStation(request);
            return ApiResponse.<CreateStationResponse>builder()
                    .status("success")
                    .message("Create station successful")
                    .data(result)
                    .timestamp(Instant.now())
                    .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @GetMapping("/paged")
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
                .message("Get stations page successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<StationResponse> getbyID(@PathVariable Long id){
        StationResponse result = stationService.getStationbyID(id);
        return ApiResponse.<StationResponse>builder()
                .status("success")
                .message("Get station by id successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }
    @GetMapping
    public ApiResponse<List<StationResponse>> getAll(){
        List<StationResponse> result = stationService.getAllStation();
        return ApiResponse.<List<StationResponse>>builder()
                .status("success")
                .message("Get all stations successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }
    @PutMapping("/{id}")
    public ApiResponse<StationResponse> update(@PathVariable Long id, @RequestBody UpdateStationRequest request) {
        StationResponse result = stationService.updateStation(id, request);
        return ApiResponse.<StationResponse>builder()
                .status("success")
                .message("Update station successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @DeleteMapping("/{id}")
    public String delete(@PathVariable Long id) {
        return stationService.deleteStation(id);
    }
}
