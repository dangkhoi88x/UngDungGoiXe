package com.example.ungdunggoixe.entity;

import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.VehicleStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@Table(name="vehicles")
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Vehicle extends AuditableEntity {

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
    @ElementCollection
    @CollectionTable(name = "vehicle_photos", joinColumns = @JoinColumn(name = "vehicle_id"))
    @Column(name = "photo_url")
    @Builder.Default
    private List<String> photos = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private VehicleStatus  status = VehicleStatus.AVAILABLE;

    @ElementCollection
    @CollectionTable(name = "vehicle_policies", joinColumns = @JoinColumn(name = "vehicle_id"))
    @Column(name = "policy_text", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> policies = new ArrayList<>();

    private BigDecimal hourlyRate;

    private BigDecimal dailyRate;
    private BigDecimal depositAmount;
    // ───────────────────────────────────────────
    // Enums
    // ───────────────────────────────────────────



}
