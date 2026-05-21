package com.example.ungdunggoixe.dto.request;

import com.example.ungdunggoixe.common.BookingStatus;
import com.example.ungdunggoixe.common.PaymentStatus;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

@Getter
@Setter
public class BookingPageRequest {
    private Long renterId;
    private Long stationId;
    private Long vehicleId;
    private BookingStatus status;
    private PaymentStatus paymentStatus;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime startTimeFrom;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime startTimeTo;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime createdAtFrom;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime createdAtTo;

    private String keyword;
    private int page = 0;
    private int size = 10;
    private String sortBy = "id";
    private String sortDir = "desc";
}
