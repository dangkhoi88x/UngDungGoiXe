package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.PagedAdminBookingFeedbackResponse;
import com.example.ungdunggoixe.service.AdminBookingFeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
            @RequestParam(defaultValue = "20") int size
    ) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), MAX_PAGE_SIZE);
        var pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        PagedAdminBookingFeedbackResponse data = adminBookingFeedbackService.list(pageable);
        return ApiResponse.<PagedAdminBookingFeedbackResponse>builder()
                .status("success")
                .message("Lay danh sach danh gia booking thanh cong")
                .data(data)
                .timestamp(Instant.now())
                .build();
    }
}
