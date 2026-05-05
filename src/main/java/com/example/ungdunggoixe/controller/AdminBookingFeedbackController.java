package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.PagedAdminBookingFeedbackResponse;
import com.example.ungdunggoixe.service.AdminBookingFeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/booking-feedbacks")
public class AdminBookingFeedbackController {

    private static final int MAX_PAGE_SIZE = 100;

    private final AdminBookingFeedbackService adminBookingFeedbackService;

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @GetMapping
    public ApiResponse<PagedAdminBookingFeedbackResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer minRating,
            @RequestParam(required = false) Boolean hasPhotos
    ) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), MAX_PAGE_SIZE);
        PagedAdminBookingFeedbackResponse data = adminBookingFeedbackService.list(
                safePage,
                safeSize,
                sortBy,
                sortDir,
                keyword,
                minRating,
                hasPhotos
        );
        return ApiResponse.<PagedAdminBookingFeedbackResponse>builder()
                .status("success")
                .message("Lay danh sach danh gia booking thanh cong")
                .data(data)
                .timestamp(Instant.now())
                .build();
    }
}
