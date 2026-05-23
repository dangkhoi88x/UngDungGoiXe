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
public class OwnerRevenueDashboardResponse {
    private BigDecimal totalRevenue;
    private BigDecimal revenueThisMonth;
    private long completedBookings;
    private long activeVehicles;
    private List<DailyRevenue> revenueLast7Days;
    private List<VehicleRevenue> vehicles;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailyRevenue {
        private String date;
        private BigDecimal revenue;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VehicleRevenue {
        private Long vehicleId;
        private String vehicleName;
        private String licensePlate;
        private long completedBookings;
        private BigDecimal revenue;
    }
}
