package com.example.ungdunggoixe.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

 @Id
 @GeneratedValue(strategy = GenerationType.IDENTITY)
 private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_method", length = 20)
    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod;

    @Column(name = "status", length = 20)
    @Enumerated(EnumType.STRING)
    private PaymentStatus status;

    @Column(name = "payment_purpose", length = 30)
    @Enumerated(EnumType.STRING)
    private PaymentPurpose paymentPurpose;

    /**
     * Chi tiết cho paymentMethod=MOMO: captureWallet (MoMo ví) hoặc payWithATM (thẻ ATM nội địa).
     */
    @Column(name = "momo_request_type", length = 30)
    private String momoRequestType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by")
    private User processedBy;

    @Column(name = "transaction_id", length = 255)
    private String transactionId;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // ───────────────────────────────────────────
    // Enums
    // ───────────────────────────────────────────
    public enum PaymentMethod {
        /** Tiền mặt — thanh toán / cọc tại trạm (luồng đồ án). */
        CASH,
        MOMO
    }

    public enum PaymentStatus {
        PENDING,
        PAID,
        FAILED,
        PARTIALLY_PAID
    }

    public enum PaymentPurpose {
        DEPOSIT,
        PREPAID_TOTAL,
        TOPUP,
        REFUND
    }
}
