package com.example.ungdunggoixe.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingVehicleFeedbackResponse {
    private Long id;
    private Long bookingId;
    private Long vehicleId;
    private Double vehicleRating;
    private String comment;
    private List<String> photoUrls;
    private Long createdBy;
    private Long updatedBy;
    private Instant createdAt;
}
