package com.example.ungdunggoixe.dto.response;

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
public class BookingResponse {
    private Long id;
    private String bookingCode;

    // User info
    private Long renterId;
    private String renterName;

    // Vehicle info
    private Long vehicleId;
    private String vehicleName;

    // Station info
    private Long stationId;
    private String stationName;

    private LocalDateTime startTime;
    private LocalDateTime expectedEndTime;
    private LocalDateTime actualEndTime;

    private BookingStatus status;

    // Staff
    private Long checkedOutById;
    private Long checkedInById;

    private BigDecimal basePrice;
    private BigDecimal partiallyPaid;
    private BigDecimal extraFee;
    private BigDecimal totalAmount;

    private String pickupNote;
    private String returnNote;

    private PaymentStatus paymentStatus;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
