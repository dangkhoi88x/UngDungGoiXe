package com.example.ungdunggoixe.entity;

import com.example.ungdunggoixe.common.StationStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "stations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Station extends AuditableEntity {
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

    /** Vĩ độ WGS84 — dùng cho bản đồ (Google Maps, …). Nullable nếu chưa gán. */
    private Double latitude;
    /** Kinh độ WGS84 — nullable nếu chưa gán. */
    private Double longitude;
}
