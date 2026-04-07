package com.example.ungdunggoixe.dto.request;

import com.example.ungdunggoixe.common.StationStatus;
import lombok.*;

import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateStationRequest {
    private String name;
    private String address;
    private Double latitude;
    private Double longitude;
    private String hotline;
    private String photo;

    private StationStatus status;

    private LocalTime startTime;
    private LocalTime endTime;
}
