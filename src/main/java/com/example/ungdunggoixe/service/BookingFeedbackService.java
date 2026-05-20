package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.BookingStatus;
import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.dto.request.SubmitBookingVehicleFeedbackRequest;
import com.example.ungdunggoixe.dto.response.BookingVehicleFeedbackResponse;
import com.example.ungdunggoixe.entity.Booking;
import com.example.ungdunggoixe.entity.Feedback;
import com.example.ungdunggoixe.entity.Vehicle;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.repository.BookingRepository;
import com.example.ungdunggoixe.repository.FeedbackRepository;
import com.example.ungdunggoixe.repository.VehicleRepository;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.net.URI;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public interface BookingFeedbackService {
    BookingVehicleFeedbackResponse getMyFeedbackForBooking(Long bookingId, Long renterUserId);
    String uploadFeedbackPhoto(Long bookingId, Long renterUserId, MultipartFile file);
    BookingVehicleFeedbackResponse submitVehicleFeedback( Long bookingId, Long renterUserId, SubmitBookingVehicleFeedbackRequest request );
}
