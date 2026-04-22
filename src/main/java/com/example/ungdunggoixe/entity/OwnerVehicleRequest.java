package com.example.ungdunggoixe.entity;

import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.OwnerVehicleRequestStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "owner_vehicle_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OwnerVehicleRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "station_id", nullable = false)
    private Station station;

    @Column(name = "license_plate", length = 20, nullable = false)
    private String licensePlate;

    private String name;
    private String brand;

    @Enumerated(EnumType.STRING)
    @Column(name = "fuel_type", length = 20)
    private FuelType fuelType;

    private Integer capacity;

    @Column(name = "hourly_rate")
    private BigDecimal hourlyRate;

    @Column(name = "daily_rate")
    private BigDecimal dailyRate;

    @Column(name = "deposit_amount")
    private BigDecimal depositAmount;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String address;
    private Double latitude;
    private Double longitude;

    @Column(name = "registration_doc_url", length = 2048)
    private String registrationDocUrl;

    @Column(name = "insurance_doc_url", length = 2048)
    private String insuranceDocUrl;

    @ElementCollection
    @CollectionTable(name = "owner_vehicle_request_photos", joinColumns = @JoinColumn(name = "request_id"))
    @Column(name = "photo_url", length = 2048)
    @Builder.Default
    private List<String> photos = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "owner_vehicle_request_policies", joinColumns = @JoinColumn(name = "request_id"))
    @Column(name = "policy_text", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> policies = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "owner_vehicle_request_history", joinColumns = @JoinColumn(name = "request_id"))
    @OrderBy("createdAt ASC")
    @Builder.Default
    private List<OwnerVehicleRequestHistoryItem> history = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(length = 32, nullable = false)
    @Builder.Default
    private OwnerVehicleRequestStatus status = OwnerVehicleRequestStatus.PENDING;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_vehicle_id")
    private Vehicle approvedVehicle;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
