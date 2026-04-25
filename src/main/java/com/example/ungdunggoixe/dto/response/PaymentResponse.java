package com.example.ungdunggoixe.dto.response;

import com.example.ungdunggoixe.entity.Payment.PaymentMethod;
import com.example.ungdunggoixe.entity.Payment.PaymentPurpose;
import com.example.ungdunggoixe.entity.Payment.PaymentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResponse {
    private Long id;
    private Long bookingId;
    private String bookingCode;
    private BigDecimal amount;
    private PaymentMethod paymentMethod;
    private PaymentPurpose paymentPurpose;
    /** captureWallet | payWithATM (khi paymentMethod=MOMO). */
    private String momoRequestType;
    private PaymentStatus status;
    private Long processedById;
    private String transactionId;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
}
