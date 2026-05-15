package com.example.ungdunggoixe.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "feedbacks")
public class Feedback extends AuditableEntity {
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", unique = true)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "renter_id", nullable = false)
    private User renter;

    @Column(name = "vehicle_rating")
    private Double vehicleRating;

    @Column(name = "station_rating")
    private Double stationRating;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @ElementCollection
    @CollectionTable(name = "feedback_photos", joinColumns = @JoinColumn(name = "feedback_id"))
    @Column(name = "photo_url", length = 2048)
    @Builder.Default
    private List<String> photoUrls = new ArrayList<>();

    @Column(name = "is_edit")
    @Builder.Default
    private Boolean isEdit = false;

    @Column(name = "response", columnDefinition = "TEXT")
    private String response;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responded_by")
    private User respondedBy;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;
}
