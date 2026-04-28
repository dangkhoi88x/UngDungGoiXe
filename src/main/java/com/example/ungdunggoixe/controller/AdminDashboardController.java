package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.response.AdminOverviewStatsResponse;
import com.example.ungdunggoixe.dto.response.AdminDashboardChartsResponse;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/dashboard")
public class AdminDashboardController {
    private final AdminDashboardService adminDashboardService;

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @GetMapping("/overview-stats")
    public ApiResponse<AdminOverviewStatsResponse> getOverviewStats() {
        AdminOverviewStatsResponse stats = adminDashboardService.getOverviewStats();
        return ApiResponse.<AdminOverviewStatsResponse>builder()
                .status("success")
                .message("Lay thong ke tong quan thanh cong")
                .data(stats)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @GetMapping("/charts")
    public ApiResponse<AdminDashboardChartsResponse> getCharts() {
        AdminDashboardChartsResponse charts = adminDashboardService.getCharts();
        return ApiResponse.<AdminDashboardChartsResponse>builder()
                .status("success")
                .message("Lay du lieu bieu do thanh cong")
                .data(charts)
                .timestamp(Instant.now())
                .build();
    }
}
