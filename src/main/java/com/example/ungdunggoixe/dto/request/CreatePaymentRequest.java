package com.example.ungdunggoixe.dto.request;

import com.example.ungdunggoixe.entity.Payment;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePaymentRequest {
    private Long bookingId;
    /** Số tiền cọc / thanh toán tại trạm (tiền mặt). */
    private BigDecimal amount;
    /** Thanh toán tại trạm: chỉ {@link Payment.PaymentMethod#CASH}. Nếu null → CASH. */
    private Payment.PaymentMethod paymentMethod;
    private String transactionId;
}
