package com.example.ungdunggoixe.dto.response;

import com.example.ungdunggoixe.common.StationStatus;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@Builder
@AllArgsConstructor
public class CreateStationResponse {
    private Long id;

    private String name;

    private String address;

    private Double rating;

    private String hotline;

    private StationStatus status;

    private String photo;

    private LocalTime startTime;

    private LocalTime endTime;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
