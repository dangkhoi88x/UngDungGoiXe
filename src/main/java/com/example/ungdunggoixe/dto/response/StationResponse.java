package com.example.ungdunggoixe.dto.response;

import com.example.ungdunggoixe.common.StationStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalTime;

@Getter
@Setter
@Builder
public class StationResponse {
    private Long id;
    private String name;
    private String address;
    private String hotline;
    private StationStatus status;
    private Double rating;
    private String photo;
    private LocalTime startTime;
    private LocalTime endTime;

    private Double latitude;
    private Double longitude;
}
