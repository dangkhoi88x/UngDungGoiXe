package com.example.ungdunggoixe.dto.response;

import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.VehicleStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@Builder
@AllArgsConstructor
public class CreateVehicleResponse {
    private Long id;

    private Long stationId;

    private String licensePlate;
    private String name;
    private String brand;

    private FuelType fuelType;
    private Double rating;
    private Integer capacity;

    private Integer rentCount;
    private List<String> photos;

    private VehicleStatus status;

    private BigDecimal hourlyRate;
    private BigDecimal dailyRate;
    private BigDecimal depositAmount;

    private List<String> policies;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
