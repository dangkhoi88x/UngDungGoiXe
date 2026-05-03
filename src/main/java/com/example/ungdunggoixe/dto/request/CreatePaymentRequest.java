package com.example.ungdunggoixe.dto.request;

import com.example.ungdunggoixe.entity.Payment;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePaymentRequest {
    @NotNull(message = "Booking ID không được để trống")
    private Long bookingId;

    /** Số tiền cọc / thanh toán tại trạm (tiền mặt). */
    @NotNull(message = "Số tiền không được để trống")
    @Positive(message = "Số tiền phải lớn hơn 0")
    private BigDecimal amount;

    /** Thanh toán tại trạm: chỉ {@link Payment.PaymentMethod#CASH}. Nếu null → CASH. */
    private Payment.PaymentMethod paymentMethod;
    /** Mục đích thanh toán: DEPOSIT/PREPAID_TOTAL/TOPUP/REFUND. */
    private Payment.PaymentPurpose paymentPurpose;
    private String transactionId;
}
