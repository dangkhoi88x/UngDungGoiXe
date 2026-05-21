package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.common.BookingStatus;
import com.example.ungdunggoixe.dto.momo.CreatePaymentResponse;
import com.example.ungdunggoixe.dto.request.BookingPageRequest;
import com.example.ungdunggoixe.dto.request.CreateBookingRequest;
import com.example.ungdunggoixe.dto.request.UpdateBookingRequest;
import com.example.ungdunggoixe.dto.request.SubmitBookingVehicleFeedbackRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.BookingResponse;
import com.example.ungdunggoixe.dto.response.BookingVehicleFeedbackResponse;
import com.example.ungdunggoixe.dto.response.PageResponse;
import com.example.ungdunggoixe.service.BookingFeedbackService;
import com.example.ungdunggoixe.service.BookingService;
import com.example.ungdunggoixe.service.I18nService;
import com.example.ungdunggoixe.service.PaymentService;
import com.example.ungdunggoixe.util.JwtPrincipalUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bookings")
public class BookingController {
    private final BookingService bookingService;
    private final BookingFeedbackService bookingFeedbackService;
    private final I18nService i18nService;
    private final PaymentService paymentService;

    @PostMapping
    @Operation(summary = "Tao booking", description = "Tao don dat xe moi va tinh tong tien du kien.")
    public ApiResponse<BookingResponse> create(@Valid @RequestBody CreateBookingRequest request) {
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
        Long userId = JwtPrincipalUtils.requireUserId(jwt);
        List<BookingResponse> result = bookingService.getMyBookings(userId);
        return ApiResponse.<List<BookingResponse>>builder()
                .status("success")
                .message(i18nService.getMessage("response.booking.my_list.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @GetMapping("/paged")
    public ApiResponse<PageResponse<BookingResponse>> getBookingsPaged(@ModelAttribute BookingPageRequest request) {
        PageResponse<BookingResponse> result = bookingService.getBookingsPaged(request);
        return ApiResponse.<PageResponse<BookingResponse>>builder()
                .status("success")
                .message(i18nService.getMessage("response.booking.page.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PostMapping(value = "/{id}/feedback/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Upload anh kem danh gia (S3)",
            description = "Truoc khi POST /bookings/{id}/feedback: tai anh len S3 (folder bookings/{id}/feedback). Chi booking COMPLETED, chua co feedback.")
    public ApiResponse<Map<String, String>> uploadBookingFeedbackPhoto(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam("file") MultipartFile file
    ) {
        Long userId = JwtPrincipalUtils.requireUserId(jwt);
        String url = bookingFeedbackService.uploadFeedbackPhoto(id, userId, file);
        return ApiResponse.<Map<String, String>>builder()
                .status("success")
                .message(i18nService.getMessage("response.booking.feedback.photo.upload.success"))
                .data(Map.of("url", url))
                .timestamp(Instant.now())
                .build();
    }

    @PostMapping("/{id}/feedback")
    @Operation(
            summary = "Danh gia xe sau khi hoan thanh thue",
            description = "Diem sao (1-5), comment; photoUrls tuy chon (URL tu POST .../feedback/photos). Toi da 8 anh. Mot booking mot lan.")
    public ApiResponse<BookingVehicleFeedbackResponse> submitVehicleFeedback(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody SubmitBookingVehicleFeedbackRequest body
    ) {
        Long userId = JwtPrincipalUtils.requireUserId(jwt);
        BookingVehicleFeedbackResponse result =
                bookingFeedbackService.submitVehicleFeedback(id, userId, body);
        return ApiResponse.<BookingVehicleFeedbackResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.booking.feedback.submit.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @GetMapping("/{id}/feedback/me")
    @Operation(summary = "Lay danh gia xe cua toi cho booking", description = "Chi nguoi thue xem duoc feedback da gui.")
    public ApiResponse<BookingVehicleFeedbackResponse> getMyVehicleFeedback(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long userId = JwtPrincipalUtils.requireUserId(jwt);
        BookingVehicleFeedbackResponse result =
                bookingFeedbackService.getMyFeedbackForBooking(id, userId);
        return ApiResponse.<BookingVehicleFeedbackResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.booking.feedback.get.success"))
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
    public ApiResponse<BookingResponse> update(@PathVariable Long id, @Valid @RequestBody UpdateBookingRequest request) {
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
    public ApiResponse<BookingResponse> cancel(@PathVariable Long id) {
        BookingResponse result = bookingService.cancelBooking(id);
        return ApiResponse.<BookingResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.booking.cancel.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PostMapping("/{id}/payments/momo/prepay-total")
    @Operation(
            summary = "Thanh toan tong truoc qua MoMo",
            description = "Tao giao dich MoMo tra truoc (estimatedRental + depositAmount). "
                    + "Tham so momoRequestType: captureWallet = vi MoMo; payWithATM = the ATM noi dia (theo tai lieu MoMo payWithATM).")
    public ApiResponse<CreatePaymentResponse> prepayTotalByMomo(
            @PathVariable Long id,
            @Parameter(
                    description = "captureWallet = vi MoMo; payWithATM = the ATM noi dia (MoMo v2)",
                    example = "captureWallet")
            @RequestParam(defaultValue = "captureWallet") String momoRequestType) {
        CreatePaymentResponse result = paymentService.createMomoPrepayTotal(id, momoRequestType);
        return ApiResponse.<CreatePaymentResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.payment.momo_prepay_total.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }
}
