package com.example.ungdunggoixe.dto.request;

import com.example.ungdunggoixe.common.FuelType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class CreateOwnerVehicleRequest {
    @NotNull(message = "Station ID không được để trống")
    private Long stationId;

    @NotBlank(message = "Biển số xe không được để trống")
    private String licensePlate;

    @NotBlank(message = "Tên xe không được để trống")
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

    @NotBlank(message = "URL giấy đăng ký xe không được để trống")
    private String registrationDocUrl;

    @NotBlank(message = "URL bảo hiểm xe không được để trống")
    private String insuranceDocUrl;

    @NotNull(message = "Danh sách ảnh không được để trống")
    @Size(min = 3, message = "Cần ít nhất 3 ảnh xe")
    private List<String> photos;

    private List<String> policies;
}
