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
public class AdminBookingFeedbackRowResponse {
    private Long id;
    private Long bookingId;
    private String bookingCode;
    private Long vehicleId;
    private String vehicleName;
    private Long renterId;
    private String renterEmail;
    private String renterDisplayName;
    private Double vehicleRating;
    private String comment;
    private List<String> photoUrls;
    private Long createdBy;
    private Long updatedBy;
    private Instant createdAt;
}
