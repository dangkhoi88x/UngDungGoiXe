package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.constant.SecurityConstants;
import com.example.ungdunggoixe.dto.request.CreatePaymentRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.PaymentResponse;
import com.example.ungdunggoixe.entity.Payment;
import com.example.ungdunggoixe.service.I18nService;
import com.example.ungdunggoixe.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
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
    private final I18nService i18nService;

    /**
     * Tạo bản ghi thanh toán (cọc hoặc thanh toán)
     * POST /payments
     */
    @PostMapping
    @Operation(summary = "Tao thanh toan", description = "Tao ban ghi thanh toan cho booking (dat coc/thanh toan).")
    public ApiResponse<PaymentResponse> create(@Valid @RequestBody CreatePaymentRequest request) {
        PaymentResponse result = paymentService.createPayment(request);
        return ApiResponse.<PaymentResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.payment.create.success"))
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
                .message(i18nService.getMessage("response.payment.by_booking.success"))
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
                .message(i18nService.getMessage("response.payment.get_by_id.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @GetMapping("/pending-adjustments")
    @PreAuthorize(SecurityConstants.CAN_MANAGE_PAYMENTS)
    @Operation(summary = "Danh sach dieu chinh cho xu ly", description = "Lay danh sach payment PENDING theo purpose TOPUP hoac REFUND de admin xu ly nhanh.")
    public ApiResponse<List<PaymentResponse>> getPendingAdjustments(@RequestParam Payment.PaymentPurpose purpose) {
        List<PaymentResponse> result = paymentService.getPendingAdjustments(purpose);
        return ApiResponse.<List<PaymentResponse>>builder()
                .status("success")
                .message(i18nService.getMessage("response.payment.pending_adjustments.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    /**
     * Xác nhận thanh toán thành công (staff/admin)
     * PATCH /payments/{id}/confirm
     */
    @PatchMapping("/{id}/confirm")
    @PreAuthorize(SecurityConstants.CAN_MANAGE_PAYMENTS)
    @Operation(summary = "Xac nhan thanh toan", description = "Danh dau thanh toan thanh cong.")
    public ApiResponse<PaymentResponse> confirm(@PathVariable Long id) {
        PaymentResponse result = paymentService.confirmPayment(id);
        return ApiResponse.<PaymentResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.payment.confirm.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PatchMapping("/{id}/confirm-topup")
    @PreAuthorize(SecurityConstants.CAN_MANAGE_PAYMENTS)
    @Operation(summary = "Xac nhan thu them TOPUP", description = "Xac nhan da thu them cho payment purpose = TOPUP.")
    public ApiResponse<PaymentResponse> confirmTopup(@PathVariable Long id) {
        PaymentResponse result = paymentService.confirmTopupPayment(id);
        return ApiResponse.<PaymentResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.payment.topup.confirm.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PatchMapping("/{id}/confirm-refund")
    @PreAuthorize(SecurityConstants.CAN_MANAGE_PAYMENTS)
    @Operation(summary = "Xac nhan hoan tien REFUND", description = "Xac nhan da hoan tien cho payment purpose = REFUND.")
    public ApiResponse<PaymentResponse> confirmRefund(@PathVariable Long id) {
        PaymentResponse result = paymentService.confirmRefundPayment(id);
        return ApiResponse.<PaymentResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.payment.refund.confirm.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    /**
     * Đánh dấu thanh toán thất bại
     * PATCH /payments/{id}/fail
     */
    @PatchMapping("/{id}/fail")
    @PreAuthorize(SecurityConstants.CAN_MANAGE_PAYMENTS)
    @Operation(summary = "Danh dau thanh toan that bai", description = "Cap nhat trang thai thanh toan ve FAILED.")
    public ApiResponse<PaymentResponse> fail(@PathVariable Long id) {
        PaymentResponse result = paymentService.failPayment(id);
        return ApiResponse.<PaymentResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.payment.fail.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }
}
