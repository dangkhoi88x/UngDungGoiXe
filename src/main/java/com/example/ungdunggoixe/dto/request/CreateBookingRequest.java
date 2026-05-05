package com.example.ungdunggoixe.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotNull;
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
    @NotNull(message = "Renter ID không được để trống")
    @JsonAlias("userId")
    private Long renterId;

    @NotNull(message = "Vehicle ID không được để trống")
    private Long vehicleId;

    @NotNull(message = "Station ID không được để trống")
    private Long stationId;

    @NotNull(message = "Thời gian bắt đầu không được để trống")
    private LocalDateTime startTime;

    @NotNull(message = "Thời gian kết thúc dự kiến không được để trống")
    private LocalDateTime expectedEndTime;

    private String pickupNote;
}
