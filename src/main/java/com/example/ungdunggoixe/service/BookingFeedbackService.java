package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.dto.request.SubmitBookingVehicleFeedbackRequest;
import com.example.ungdunggoixe.dto.response.BookingVehicleFeedbackResponse;
import org.springframework.web.multipart.MultipartFile;

public interface BookingFeedbackService {
    BookingVehicleFeedbackResponse getMyFeedbackForBooking(Long bookingId, Long renterUserId);
    String uploadFeedbackPhoto(Long bookingId, Long renterUserId, MultipartFile file);
    BookingVehicleFeedbackResponse submitVehicleFeedback( Long bookingId, Long renterUserId, SubmitBookingVehicleFeedbackRequest request );
}
