package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.constant.SecurityConstants;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.AdminBookingFeedbackRowResponse;
import com.example.ungdunggoixe.dto.response.PageResponse;
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

    @PreAuthorize(SecurityConstants.CAN_MANAGE_BOOKINGS)
    @GetMapping
    public ApiResponse<PageResponse<AdminBookingFeedbackRowResponse>> list(
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
        PageResponse<AdminBookingFeedbackRowResponse> data = adminBookingFeedbackService.list(
                safePage,
                safeSize,
                sortBy,
                sortDir,
                keyword,
                minRating,
                hasPhotos
        );
        return ApiResponse.<PageResponse<AdminBookingFeedbackRowResponse>>builder()
                .status("success")
                .message("Lay danh sach danh gia booking thanh cong")
                .data(data)
                .timestamp(Instant.now())
                .build();
    }
}
