package com.example.ungdunggoixe.dto.request;

import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.entity.Station;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
public class CreateVehicleRequest {
    private Station station;

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
