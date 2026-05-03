package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.BookingStatus;
import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.dto.response.AdminDashboardChartsResponse;
import com.example.ungdunggoixe.dto.response.AdminOverviewStatsResponse;
import com.example.ungdunggoixe.entity.Vehicle;
import com.example.ungdunggoixe.repository.BookingRepository;
import com.example.ungdunggoixe.repository.PaymentRepository;
import com.example.ungdunggoixe.repository.UserRepository;
import com.example.ungdunggoixe.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {
    private static final int LAST_7_DAYS = 7;
    private static final int TOP_VEHICLES_LIMIT = 5;

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public AdminOverviewStatsResponse getOverviewStats() {
        LocalDate today = LocalDate.now();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime tomorrowStart = today.plusDays(1).atStartOfDay();

        LocalDate firstDayOfMonth = today.withDayOfMonth(1);
        LocalDateTime monthStart = firstDayOfMonth.atStartOfDay();
        LocalDateTime nextMonthStart = firstDayOfMonth.plusMonths(1).atStartOfDay();

        LocalDateTime sevenDaysAgo = todayStart.minusDays(6);

        BigDecimal revenueThisMonth = paymentRepository.sumNetPaidAmountBetween(monthStart, nextMonthStart);

        return AdminOverviewStatsResponse.builder()
                .bookingsToday(bookingRepository.countByCreatedAtBetween(todayStart, tomorrowStart))
                .ongoingBookings(bookingRepository.countByStatus(BookingStatus.ONGOING))
                .availableVehicles(vehicleRepository.countByStatus(VehicleStatus.AVAILABLE))
                .revenueThisMonth(revenueThisMonth == null ? BigDecimal.ZERO : revenueThisMonth)
                .newUsersLast7Days(userRepository.countByCreatedAtGreaterThanEqual(sevenDaysAgo))
                .build();
    }

    @Transactional(readOnly = true)
    public AdminDashboardChartsResponse getCharts() {
        LocalDate today = LocalDate.now();
        List<AdminDashboardChartsResponse.DailyMetric> bookingsLast7Days = new ArrayList<>(LAST_7_DAYS);
        List<AdminDashboardChartsResponse.DailyMetric> revenueLast7Days = new ArrayList<>(LAST_7_DAYS);

        for (int i = LAST_7_DAYS - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            LocalDateTime dayStart = day.atStartOfDay();
            LocalDateTime dayEnd = day.plusDays(1).atStartOfDay();

            long bookingsCount = bookingRepository.countByCreatedAtBetween(dayStart, dayEnd);
            BigDecimal revenue = paymentRepository.sumNetPaidAmountBetween(dayStart, dayEnd);

            bookingsLast7Days.add(AdminDashboardChartsResponse.DailyMetric.builder()
                    .date(day.toString())
                    .value(bookingsCount)
                    .build());
            revenueLast7Days.add(AdminDashboardChartsResponse.DailyMetric.builder()
                    .date(day.toString())
                    .value(revenue == null ? 0L : revenue.longValue())
                    .build());
        }

        List<AdminDashboardChartsResponse.StatusMetric> bookingStatusBreakdown = List.of(
                statusMetric("PENDING", bookingRepository.countByStatus(BookingStatus.PENDING)),
                statusMetric("CONFIRMED", bookingRepository.countByStatus(BookingStatus.CONFIRMED)),
                statusMetric("ONGOING", bookingRepository.countByStatus(BookingStatus.ONGOING)),
                statusMetric("COMPLETED", bookingRepository.countByStatus(BookingStatus.COMPLETED)),
                statusMetric("CANCELLED", bookingRepository.countByStatus(BookingStatus.CANCELLED))
        );

        List<AdminDashboardChartsResponse.StatusMetric> vehicleStatusBreakdown = List.of(
                statusMetric("AVAILABLE", vehicleRepository.countByStatus(VehicleStatus.AVAILABLE)),
                statusMetric("RENTED", vehicleRepository.countByStatus(VehicleStatus.RENTED)),
                statusMetric("MAINTENANCE", vehicleRepository.countByStatus(VehicleStatus.MAINTENANCE))
        );

        List<AdminDashboardChartsResponse.TopVehicleMetric> topVehiclesByRentCount = vehicleRepository
                .findAll(PageRequest.of(0, TOP_VEHICLES_LIMIT, Sort.by(Sort.Direction.DESC, "rentCount")))
                .getContent()
                .stream()
                .map(this::toTopVehicleByRentCount)
                .toList();

        List<AdminDashboardChartsResponse.TopVehicleMetric> topVehiclesByRevenue = paymentRepository
                .findTopVehicleRevenueRows(PageRequest.of(0, TOP_VEHICLES_LIMIT))
                .stream()
                .map(this::toTopVehicleByRevenue)
                .toList();

        return AdminDashboardChartsResponse.builder()
                .bookingsLast7Days(bookingsLast7Days)
                .revenueLast7Days(revenueLast7Days)
                .bookingStatusBreakdown(bookingStatusBreakdown)
                .vehicleStatusBreakdown(vehicleStatusBreakdown)
                .topVehiclesByRentCount(topVehiclesByRentCount)
                .topVehiclesByRevenue(topVehiclesByRevenue)
                .build();
    }

    private AdminDashboardChartsResponse.StatusMetric statusMetric(String status, long count) {
        return AdminDashboardChartsResponse.StatusMetric.builder()
                .status(status)
                .count(count)
                .build();
    }

    private AdminDashboardChartsResponse.TopVehicleMetric toTopVehicleByRentCount(Vehicle vehicle) {
        return AdminDashboardChartsResponse.TopVehicleMetric.builder()
                .vehicleId(vehicle.getId())
                .vehicleName(vehicle.getName())
                .licensePlate(vehicle.getLicensePlate())
                .rentCount(vehicle.getRentCount() == null ? 0 : vehicle.getRentCount())
                .revenue(BigDecimal.ZERO)
                .build();
    }

    private AdminDashboardChartsResponse.TopVehicleMetric toTopVehicleByRevenue(Object[] row) {
        Long vehicleId = row[0] instanceof Number n ? n.longValue() : null;
        String vehicleName = row[1] == null ? null : String.valueOf(row[1]);
        String licensePlate = row[2] == null ? null : String.valueOf(row[2]);
        BigDecimal revenue = row[3] instanceof BigDecimal b ? b : BigDecimal.ZERO;
        return AdminDashboardChartsResponse.TopVehicleMetric.builder()
                .vehicleId(vehicleId)
                .vehicleName(vehicleName)
                .licensePlate(licensePlate)
                .rentCount(0L)
                .revenue(revenue)
                .build();
    }
}
