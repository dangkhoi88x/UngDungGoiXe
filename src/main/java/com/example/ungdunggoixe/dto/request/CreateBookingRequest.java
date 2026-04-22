package com.example.ungdunggoixe.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class CreateBookingRequest {
    /**
     * ID bản ghi trong bảng {@code users} — người thuê xe.
     * Tên {@code renterId} theo ngôn ngữ nghiệp vụ (renter = người thuê); về mặt kỹ thuật cùng nghĩa với {@code userId}.
     * Gửi JSON có thể dùng {@code "renterId"} hoặc {@code "userId"}.
     */
    @JsonAlias("userId")
    private Long renterId;
    private long vehicleId;
    private long stationId;
    private LocalDateTime  startTime;
    private LocalDateTime expectedEndTime;
    private String pickupNote;
}
