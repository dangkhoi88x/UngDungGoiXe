package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.request.CreatePaymentRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.PaymentResponse;
import com.example.ungdunggoixe.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/payments")
public class PaymentController {
    private final PaymentService paymentService;

    /**
     * Tạo bản ghi thanh toán (cọc hoặc thanh toán)
     * POST /payments
     */
    @PostMapping
    public ApiResponse<PaymentResponse> create(@RequestBody CreatePaymentRequest request) {
        PaymentResponse result = paymentService.createPayment(request);
        return ApiResponse.<PaymentResponse>builder()
                .status("success")
                .message("Create payment successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    /**
     * Lấy danh sách thanh toán theo booking
     * GET /payments?bookingId=1
     */
    @GetMapping
    public ApiResponse<List<PaymentResponse>> getByBookingId(@RequestParam Long bookingId) {
        List<PaymentResponse> result = paymentService.getPaymentsByBookingId(bookingId);
        return ApiResponse.<List<PaymentResponse>>builder()
                .status("success")
                .message("Get payments by booking successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    /**
     * Lấy chi tiết thanh toán
     * GET /payments/{id}
     */
    @GetMapping("/{id}")
    public ApiResponse<PaymentResponse> getById(@PathVariable Long id) {
        PaymentResponse result = paymentService.getPaymentById(id);
        return ApiResponse.<PaymentResponse>builder()
                .status("success")
                .message("Get payment by id successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    /**
     * Xác nhận thanh toán thành công (staff/admin)
     * PATCH /payments/{id}/confirm
     */
    @PatchMapping("/{id}/confirm")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    public ApiResponse<PaymentResponse> confirm(@PathVariable Long id) {
        PaymentResponse result = paymentService.confirmPayment(id);
        return ApiResponse.<PaymentResponse>builder()
                .status("success")
                .message("Confirm payment successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    /**
     * Đánh dấu thanh toán thất bại
     * PATCH /payments/{id}/fail
     */
    @PatchMapping("/{id}/fail")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    public ApiResponse<PaymentResponse> fail(@PathVariable Long id) {
        PaymentResponse result = paymentService.failPayment(id);
        return ApiResponse.<PaymentResponse>builder()
                .status("success")
                .message("Fail payment successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }
}
