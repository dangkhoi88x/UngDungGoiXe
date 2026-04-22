package com.example.ungdunggoixe.dto.request;

import com.example.ungdunggoixe.common.FuelType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class CreateOwnerVehicleRequest {
    private Long stationId;
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
}
