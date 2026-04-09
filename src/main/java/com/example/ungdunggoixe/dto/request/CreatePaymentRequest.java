package com.example.ungdunggoixe.dto.request;

import com.example.ungdunggoixe.entity.Payment.PaymentMethod;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePaymentRequest {
    private Long bookingId;
    private BigDecimal amount;
    private PaymentMethod paymentMethod;
    private String transactionId;
}
