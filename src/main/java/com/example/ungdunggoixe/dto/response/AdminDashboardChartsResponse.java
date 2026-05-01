package com.example.ungdunggoixe.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDashboardChartsResponse {
    private List<DailyMetric> bookingsLast7Days;
    private List<DailyMetric> revenueLast7Days;
    private List<StatusMetric> bookingStatusBreakdown;
    private List<StatusMetric> vehicleStatusBreakdown;
    private List<TopVehicleMetric> topVehiclesByRentCount;
    private List<TopVehicleMetric> topVehiclesByRevenue;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailyMetric {
        private String date;
        private long value;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StatusMetric {
        private String status;
        private long count;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TopVehicleMetric {
        private Long vehicleId;
        private String vehicleName;
        private String licensePlate;
        private long rentCount;
        private BigDecimal revenue;
    }
}
