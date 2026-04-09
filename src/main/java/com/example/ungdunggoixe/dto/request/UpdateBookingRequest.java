package com.example.ungdunggoixe.dto.request;

import com.example.ungdunggoixe.common.BookingStatus;
import com.example.ungdunggoixe.common.PaymentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateBookingRequest {
    private LocalDateTime startTime;
    private LocalDateTime expectedEndTime;
    private LocalDateTime actualEndTime;

    private BookingStatus status;
    private PaymentStatus paymentStatus;

    private BigDecimal partiallyPaid;
    private BigDecimal extraFee;
    private BigDecimal totalAmount;

    private String pickupNote;
    private String returnNote;
}

