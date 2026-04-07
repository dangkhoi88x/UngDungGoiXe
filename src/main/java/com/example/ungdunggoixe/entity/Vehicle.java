package com.example.ungdunggoixe.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Table(name="vehicles")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vehicle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id", nullable = false)
    private Station station;
    @Column(name = "license_plate", length = 20, nullable = false, unique = true)
    private String licensePlate;
    private String name;
    private String brand;
    @Column(name = "fuel_type", length = 20)
    @Enumerated(EnumType.STRING)
    private FuelType fuelType;
    private Double rating;
    private Integer capacity;
    @Builder.Default
    private Integer rentCount = 0;
    private String[] photos;
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private VehicleStatus status = VehicleStatus.AVAILABLE;

    private BigDecimal hourlyRate;

    private BigDecimal dailyRate;
    private BigDecimal depositAmount;
    private String[] polices;
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    // ───────────────────────────────────────────
    // Enums
    // ───────────────────────────────────────────
    public enum FuelType {
        GASOLINE,
        ELECTRICITY
    }

    public enum VehicleStatus {
        AVAILABLE,
        RENTED,
        MAINTENANCE,
        CHARGING,
        UNAVAILABLE
    }
}
