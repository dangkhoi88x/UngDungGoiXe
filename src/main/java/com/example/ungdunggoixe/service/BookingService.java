package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.BookingStatus;
import com.example.ungdunggoixe.dto.request.BookingPageRequest;
import com.example.ungdunggoixe.dto.request.CreateBookingRequest;
import com.example.ungdunggoixe.dto.request.UpdateBookingRequest;
import com.example.ungdunggoixe.dto.response.BookingResponse;
import com.example.ungdunggoixe.dto.response.PageResponse;

import java.time.LocalDateTime;
import java.util.List;

public interface BookingService {
    BookingResponse createBooking(CreateBookingRequest request);
    BookingResponse confirmBooking(Long id);
    BookingResponse pickupBooking(Long id);
    BookingResponse returnBooking(Long id);
    BookingResponse cancelBooking(Long id);
    boolean isVehicleAvailable(Long vehicleId, LocalDateTime start, LocalDateTime end);
    List<BookingResponse> getMyBookings(Long userId);
    BookingResponse getBookingById(Long id);
    List<BookingResponse> getBookings(Long renterId, Long stationId, BookingStatus status);
    PageResponse<BookingResponse> getBookingsPaged(BookingPageRequest request);
    BookingResponse updateBooking(Long id, UpdateBookingRequest request);
    String deleteBooking(Long id);
}
