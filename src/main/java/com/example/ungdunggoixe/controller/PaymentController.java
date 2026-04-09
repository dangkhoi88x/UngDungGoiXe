package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.request.CreatePaymentRequest;
import com.example.ungdunggoixe.dto.response.PaymentResponse;
import com.example.ungdunggoixe.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

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
    public PaymentResponse create(@RequestBody CreatePaymentRequest request) {
        return paymentService.createPayment(request);
    }

    /**
     * Lấy danh sách thanh toán theo booking
     * GET /payments?bookingId=1
     */
    @GetMapping
    public List<PaymentResponse> getByBookingId(@RequestParam Long bookingId) {
        return paymentService.getPaymentsByBookingId(bookingId);
    }

    /**
     * Lấy chi tiết thanh toán
     * GET /payments/{id}
     */
    @GetMapping("/{id}")
    public PaymentResponse getById(@PathVariable Long id) {
        return paymentService.getPaymentById(id);
    }

    /**
     * Xác nhận thanh toán thành công (staff/admin)
     * PATCH /payments/{id}/confirm
     */
    @PatchMapping("/{id}/confirm")
    public PaymentResponse confirm(@PathVariable Long id) {
        return paymentService.confirmPayment(id);
    }

    /**
     * Đánh dấu thanh toán thất bại
     * PATCH /payments/{id}/fail
     */
    @PatchMapping("/{id}/fail")
    public PaymentResponse fail(@PathVariable Long id) {
        return paymentService.failPayment(id);
    }
}
