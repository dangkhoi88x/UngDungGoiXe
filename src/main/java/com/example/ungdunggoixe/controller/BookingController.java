package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.common.BookingStatus;
import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.dto.request.CreateBookingRequest;
import com.example.ungdunggoixe.dto.request.UpdateBookingRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
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

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bookings")
public class BookingController {
    private final BookingService bookingService;

    @PostMapping
    public ApiResponse<BookingResponse> create(@RequestBody CreateBookingRequest request) {
        BookingResponse result = bookingService.createBooking(request);
        return ApiResponse.<BookingResponse>builder()
                .status("success")
                .message("Create booking successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    /**
     * Các path cố định phải đứng trước <code>/{id}</code> để tránh nhầm (vd. id = "paged", "me").
     */
    @GetMapping("/vehicle-availability")
    public ApiResponse<Map<String, Object>> checkVehicleAvailability(
            @RequestParam Long vehicleId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        boolean available = bookingService.isVehicleAvailable(vehicleId, start, end);
        Map<String, Object> result = Map.of(
                "vehicleId", vehicleId,
                "start", start.toString(),
                "end", end.toString(),
                "available", available);
        return ApiResponse.<Map<String, Object>>builder()
                .status("success")
                .message("Check vehicle availability successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @GetMapping("/me")
    public ApiResponse<List<BookingResponse>> getMyBookings(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        Long userId = Long.parseLong(jwt.getSubject());
        List<BookingResponse> result = bookingService.getMyBookings(userId);
        return ApiResponse.<List<BookingResponse>>builder()
                .status("success")
                .message("Get my bookings successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @GetMapping("/paged")
    public ApiResponse<PagedBookingResponse> getBookingsPaged(
            @RequestParam(required = false) Long renterId,
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        PagedBookingResponse result = bookingService.getBookingsPaged(renterId, stationId, status, page, size, sortBy, sortDir);
        return ApiResponse.<PagedBookingResponse>builder()
                .status("success")
                .message("Get bookings page successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<BookingResponse> getById(@PathVariable Long id) {
        BookingResponse result = bookingService.getBookingById(id);
        return ApiResponse.<BookingResponse>builder()
                .status("success")
                .message("Get booking by id successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @GetMapping
    public ApiResponse<List<BookingResponse>> getAll(
            @RequestParam(required = false) Long renterId,
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) BookingStatus status) {
        List<BookingResponse> result = bookingService.getBookings(renterId, stationId, status);
        return ApiResponse.<List<BookingResponse>>builder()
                .status("success")
                .message("Get bookings successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PutMapping("/{id}")
    public ApiResponse<BookingResponse> update(@PathVariable Long id, @RequestBody UpdateBookingRequest request) {
        BookingResponse result = bookingService.updateBooking(id, request);
        return ApiResponse.<BookingResponse>builder()
                .status("success")
                .message("Update booking successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @DeleteMapping("/{id}")
    public String delete(@PathVariable Long id) {
        return bookingService.deleteBooking(id);
    }

    @PatchMapping("/{id}/confirm")
    public ApiResponse<BookingResponse> confirm(@PathVariable Long id) {
        BookingResponse result = bookingService.confirmBooking(id);
        return ApiResponse.<BookingResponse>builder()
                .status("success")
                .message("Confirm booking successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PatchMapping("/{id}/pickup")
    public ApiResponse<BookingResponse> pickup(@PathVariable Long id) {
        BookingResponse result = bookingService.pickupBooking(id);
        return ApiResponse.<BookingResponse>builder()
                .status("success")
                .message("Pickup booking successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PatchMapping("/{id}/return")
    public ApiResponse<BookingResponse> returnVehicle(@PathVariable Long id) {
        BookingResponse result = bookingService.returnBooking(id);
        return ApiResponse.<BookingResponse>builder()
                .status("success")
                .message("Return booking successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PatchMapping("/{id}/cancel")
    public ApiResponse<BookingResponse> cancel(@PathVariable Long id) {
        BookingResponse result = bookingService.cancelBooking(id);
        return ApiResponse.<BookingResponse>builder()
                .status("success")
                .message("Cancel booking successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }
}
