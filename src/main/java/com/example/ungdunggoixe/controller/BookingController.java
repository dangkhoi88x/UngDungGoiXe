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
import com.example.ungdunggoixe.service.I18nService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
    private final I18nService i18nService;

    @PostMapping
    @Operation(summary = "Tao booking", description = "Tao don dat xe moi va tinh tong tien du kien.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Tao booking thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Du lieu booking khong hop le"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Xe khong san sang trong khoang thoi gian yeu cau")
    })
    public ApiResponse<BookingResponse> create(@RequestBody CreateBookingRequest request) {
        BookingResponse result = bookingService.createBooking(request);
        return ApiResponse.<BookingResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.booking.create.success"))
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
                .message(i18nService.getMessage("response.booking.vehicle_availability.success"))
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
                .message(i18nService.getMessage("response.booking.my_list.success"))
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
                .message(i18nService.getMessage("response.booking.page.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<BookingResponse> getById(@PathVariable Long id) {
        BookingResponse result = bookingService.getBookingById(id);
        return ApiResponse.<BookingResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.booking.get_by_id.success"))
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
                .message(i18nService.getMessage("response.booking.get_all.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PutMapping("/{id}")
    public ApiResponse<BookingResponse> update(@PathVariable Long id, @RequestBody UpdateBookingRequest request) {
        BookingResponse result = bookingService.updateBooking(id, request);
        return ApiResponse.<BookingResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.booking.update.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @DeleteMapping("/{id}")
    public String delete(@PathVariable Long id) {
        return bookingService.deleteBooking(id);
    }

    @PatchMapping("/{id}/confirm")
    @Operation(summary = "Xac nhan booking", description = "Chuyen booking tu PENDING sang CONFIRMED neu da thu du coc.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Xac nhan booking thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Chua du dieu kien xac nhan booking"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Khong tim thay booking")
    })
    public ApiResponse<BookingResponse> confirm(@PathVariable Long id) {
        BookingResponse result = bookingService.confirmBooking(id);
        return ApiResponse.<BookingResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.booking.confirm.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PatchMapping("/{id}/pickup")
    public ApiResponse<BookingResponse> pickup(@PathVariable Long id) {
        BookingResponse result = bookingService.pickupBooking(id);
        return ApiResponse.<BookingResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.booking.pickup.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PatchMapping("/{id}/return")
    public ApiResponse<BookingResponse> returnVehicle(@PathVariable Long id) {
        BookingResponse result = bookingService.returnBooking(id);
        return ApiResponse.<BookingResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.booking.return.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PatchMapping("/{id}/cancel")
    @Operation(summary = "Huy booking", description = "Huy booking theo luong trang thai hop le.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Huy booking thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Khong the huy o trang thai hien tai"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Khong tim thay booking")
    })
    public ApiResponse<BookingResponse> cancel(@PathVariable Long id) {
        BookingResponse result = bookingService.cancelBooking(id);
        return ApiResponse.<BookingResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.booking.cancel.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }
}
