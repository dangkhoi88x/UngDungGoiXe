package com.example.ungdunggoixe.dto.request;

import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class CreateBookingRequest {
    private Long renterId ;
    private long vehicleId;
    private long stationId;
    private LocalDateTime  startTime;
    private LocalDateTime expectedEndTime;
    private String pickupNote;
}
