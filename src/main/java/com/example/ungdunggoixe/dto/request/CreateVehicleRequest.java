package com.example.ungdunggoixe.dto.request;

import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.VehicleStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class CreateVehicleRequest {
    private Long stationId;

    private String licensePlate;
    private String name;
    private String brand;

    private FuelType fuelType;
    private Double rating;
    private Integer capacity;

    private Integer rentCount = 0;
    private List<String> photos;

    private VehicleStatus status = VehicleStatus.AVAILABLE;

    private BigDecimal hourlyRate;
    private BigDecimal dailyRate;
    private BigDecimal depositAmount;
    private List<String> policies;
}
