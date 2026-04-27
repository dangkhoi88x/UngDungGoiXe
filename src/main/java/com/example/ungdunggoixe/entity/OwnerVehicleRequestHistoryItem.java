package com.example.ungdunggoixe.entity;

import com.example.ungdunggoixe.common.OwnerVehicleRequestStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.*;

import java.time.LocalDateTime;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OwnerVehicleRequestHistoryItem {
    @Column(name = "event_type", length = 64)
    private String eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32)
    private OwnerVehicleRequestStatus status;

    @Column(name = "actor_role", length = 32)
    private String actorRole;

    @Column(name = "actor_id")
    private Long actorId;

    @Column(name = "actor_email", length = 255)
    private String actorEmail;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}

