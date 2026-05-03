package com.example.ungdunggoixe.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminOverviewStatsResponse {
    private long bookingsToday;
    private long ongoingBookings;
    private long availableVehicles;
    private BigDecimal revenueThisMonth;
    private long newUsersLast7Days;
}
