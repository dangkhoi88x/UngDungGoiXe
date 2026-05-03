package com.example.ungdunggoixe.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
public class CreateStationRequest {

    @NotBlank(message = "Tên trạm không được để trống")
    private String name;

    @NotBlank(message = "Địa chỉ không được để trống")
    private String address;

    private String hotline;
    private String photo;
    private LocalTime startTime;
    private LocalTime endTime;

    private Double latitude;
    private Double longitude;

}
