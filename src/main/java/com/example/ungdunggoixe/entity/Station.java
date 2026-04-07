package com.example.ungdunggoixe.entity;

import com.example.ungdunggoixe.common.StationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name="stations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Station {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String name;
    @Column(nullable = false)
    private String address;
    private Double rating = 0.0;
    private String hotline;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StationStatus status = StationStatus.ACTIVE;
    private String photo;
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;


}
