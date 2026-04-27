package com.example.ungdunggoixe.dto.response;

import com.example.ungdunggoixe.common.OwnerVehicleRequestStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OwnerVehicleRequestHistoryItemResponse {
    private String eventType;
    private OwnerVehicleRequestStatus status;
    private String actorRole;
    private Long actorId;
    private String actorEmail;
    private String note;
    private LocalDateTime createdAt;
}

