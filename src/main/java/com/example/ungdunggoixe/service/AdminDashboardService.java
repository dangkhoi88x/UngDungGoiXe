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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public interface AdminDashboardService {
    AdminOverviewStatsResponse getOverviewStats();
    AdminDashboardChartsResponse getCharts();
}
