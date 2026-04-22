package com.example.ungdunggoixe.dto.response;

import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.OwnerVehicleRequestStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OwnerVehicleRequestResponse {
    private Long id;
    private Long ownerId;
    private Long stationId;
    private Long approvedVehicleId;
    private String licensePlate;
    private String name;
    private String brand;
    private FuelType fuelType;
    private Integer capacity;
    private BigDecimal hourlyRate;
    private BigDecimal dailyRate;
    private BigDecimal depositAmount;
    private String description;
    private String address;
    private Double latitude;
    private Double longitude;
    private String registrationDocUrl;
    private String insuranceDocUrl;
    private List<String> photos;
    private List<String> policies;
    private OwnerVehicleRequestStatus status;
    private String adminNote;
    private List<OwnerVehicleRequestHistoryItemResponse> history;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
