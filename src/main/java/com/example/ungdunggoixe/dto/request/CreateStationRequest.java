package com.example.ungdunggoixe.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
public class CreateStationRequest {

    private String name;
    private String address;
    private String hotline;
    private String photo;
    private LocalTime startTime;
    private LocalTime endTime;

    private Double latitude;
    private Double longitude;

}
