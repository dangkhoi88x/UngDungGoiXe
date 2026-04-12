package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.common.BookingStatus;
import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.dto.request.CreateBookingRequest;
import com.example.ungdunggoixe.dto.request.UpdateBookingRequest;
import com.example.ungdunggoixe.dto.response.BookingResponse;
import com.example.ungdunggoixe.dto.response.PagedBookingResponse;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bookings")
public class BookingController {
    private final BookingService bookingService;

    @PostMapping
    public BookingResponse create(@RequestBody CreateBookingRequest request) {
        return bookingService.createBooking(request);
    }

    /**
     * Các path cố định phải đứng trước <code>/{id}</code> để tránh nhầm (vd. id = "paged", "me").
     */
    @GetMapping("/vehicle-availability")
    public ResponseEntity<Map<String, Object>> checkVehicleAvailability(
            @RequestParam Long vehicleId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        boolean available = bookingService.isVehicleAvailable(vehicleId, start, end);
        return ResponseEntity.ok(Map.of(
                "vehicleId", vehicleId,
                "start", start.toString(),
                "end", end.toString(),
                "available", available));
    }

    @GetMapping("/me")
    public List<BookingResponse> getMyBookings(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        Long userId = Long.parseLong(jwt.getSubject());
        return bookingService.getMyBookings(userId);
    }

    @GetMapping("/paged")
    public PagedBookingResponse getBookingsPaged(
            @RequestParam(required = false) Long renterId,
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return bookingService.getBookingsPaged(renterId, stationId, status, page, size, sortBy, sortDir);
    }

    @GetMapping("/{id}")
    public BookingResponse getById(@PathVariable Long id) {
        return bookingService.getBookingById(id);
    }

    @GetMapping
    public List<BookingResponse> getAll(
            @RequestParam(required = false) Long renterId,
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) BookingStatus status) {
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

    @PatchMapping("/{id}/confirm")
    public BookingResponse confirm(@PathVariable Long id) {
        return bookingService.confirmBooking(id);
    }

    @PatchMapping("/{id}/pickup")
    public BookingResponse pickup(@PathVariable Long id) {
        return bookingService.pickupBooking(id);
    }

    @PatchMapping("/{id}/return")
    public BookingResponse returnVehicle(@PathVariable Long id) {
        return bookingService.returnBooking(id);
    }

    @PatchMapping("/{id}/cancel")
    public BookingResponse cancel(@PathVariable Long id) {
        return bookingService.cancelBooking(id);
    }
}
