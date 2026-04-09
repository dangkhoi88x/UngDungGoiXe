package com.example.ungdunggoixe.dto.request;

import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.VehicleStatus;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateVehicleRequest {
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
}
