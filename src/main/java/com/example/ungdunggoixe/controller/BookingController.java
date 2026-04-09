package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.common.BookingStatus;
import com.example.ungdunggoixe.dto.request.CreateBookingRequest;
import com.example.ungdunggoixe.dto.request.UpdateBookingRequest;
import com.example.ungdunggoixe.dto.response.BookingResponse;
import com.example.ungdunggoixe.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bookings")
public class BookingController {
    private final BookingService bookingService;

    // ── Tạo booking (có kiểm tra xe trống) ──
    @PostMapping
    public BookingResponse create(@RequestBody CreateBookingRequest request) {
        return bookingService.createBooking(request);
    }

    @GetMapping("/{id}")
    public BookingResponse getById(@PathVariable Long id) {
        return bookingService.getBookingById(id);
    }

    @GetMapping
    public List<BookingResponse> getAll(
            @RequestParam(required = false) Long renterId,
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) BookingStatus status
    ) {
        return bookingService.getBookings(renterId, stationId, status);
    }

    @PutMapping("/{id}")
    public BookingResponse update(@PathVariable Long id, @RequestBody UpdateBookingRequest request) {
        return bookingService.updateBooking(id, request);
    }

    @DeleteMapping("/{id}")
    public String delete(@PathVariable Long id) {
        return bookingService.deleteBooking(id);
    }

    // ═══════════════════════════════════════════════════════
    // BOOKING LIFECYCLE ENDPOINTS
    // ═══════════════════════════════════════════════════════

    /**
     * Xác nhận booking: PENDING → CONFIRMED
     */
    @PatchMapping("/{id}/confirm")
    public BookingResponse confirm(@PathVariable Long id) {
        return bookingService.confirmBooking(id);
    }

    /**
     * Giao xe: CONFIRMED → ONGOING, Vehicle → RENTED
     */
    @PatchMapping("/{id}/pickup")
    public BookingResponse pickup(@PathVariable Long id) {
        return bookingService.pickupBooking(id);
    }

    /**
     * Trả xe: ONGOING → COMPLETED, Vehicle → AVAILABLE
     */
    @PatchMapping("/{id}/return")
    public BookingResponse returnVehicle(@PathVariable Long id) {
        return bookingService.returnBooking(id);
    }

    /**
     * Hủy booking: PENDING/CONFIRMED/ONGOING → CANCELLED
     * Nếu đang ONGOING thì xe sẽ được trả về AVAILABLE
     */
    @PatchMapping("/{id}/cancel")
    public BookingResponse cancel(@PathVariable Long id) {
        return bookingService.cancelBooking(id);
    }

    // ═══════════════════════════════════════════════════════
    // LỊCH SỬ BOOKING CỦA USER ĐANG ĐĂNG NHẬP
    // ═══════════════════════════════════════════════════════

    /**
     * Lấy danh sách booking của user đang đăng nhập
     * GET /bookings/me
     * Yêu cầu: JWT token (userId lấy từ subject claim)
     */
    @GetMapping("/me")
    public List<BookingResponse> getMyBookings(
            @org.springframework.security.core.annotation.AuthenticationPrincipal
            org.springframework.security.oauth2.jwt.Jwt jwt
    ) {
        Long userId = Long.parseLong(jwt.getSubject());
        return bookingService.getMyBookings(userId);
    }

    // ═══════════════════════════════════════════════════════
    // VEHICLE AVAILABILITY CHECK
    // ═══════════════════════════════════════════════════════

    /**
     * Kiểm tra xe có sẵn theo time range
     * GET /bookings/vehicle-availability?vehicleId=1&start=2026-04-10T08:00&end=2026-04-10T18:00
     */
    @GetMapping("/vehicle-availability")
    public ResponseEntity<Map<String, Object>> checkVehicleAvailability(
            @RequestParam Long vehicleId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end
    ) {
        boolean available = bookingService.isVehicleAvailable(vehicleId, start, end);
        return ResponseEntity.ok(Map.of(
                "vehicleId", vehicleId,
                "start", start.toString(),
                "end", end.toString(),
                "available", available
        ));
    }
}
