package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.dto.response.AdminBookingFeedbackRowResponse;
import com.example.ungdunggoixe.dto.response.PagedAdminBookingFeedbackResponse;
import com.example.ungdunggoixe.entity.Booking;
import com.example.ungdunggoixe.entity.Feedback;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.entity.Vehicle;
import com.example.ungdunggoixe.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminBookingFeedbackService {

    private final FeedbackRepository feedbackRepository;

    @Transactional(readOnly = true)
    public PagedAdminBookingFeedbackResponse list(Pageable pageable) {
        Page<Feedback> page = feedbackRepository.findAllByOrderByCreatedAtDesc(pageable);
        List<AdminBookingFeedbackRowResponse> rows = page.getContent().stream()
                .map(this::toRow)
                .toList();
        return PagedAdminBookingFeedbackResponse.builder()
                .content(rows)
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .page(page.getNumber())
                .size(page.getSize())
                .build();
    }

    private AdminBookingFeedbackRowResponse toRow(Feedback fb) {
        Booking booking = fb.getBooking();
        User renter = fb.getRenter();
        Vehicle vehicle = booking != null ? booking.getVehicle() : null;

        String displayName = renterDisplayName(renter);
        List<String> photos = fb.getPhotoUrls() != null ? fb.getPhotoUrls() : List.of();

        return AdminBookingFeedbackRowResponse.builder()
                .id(fb.getId())
                .bookingId(booking != null ? booking.getId() : null)
                .bookingCode(booking != null ? booking.getBookingCode() : null)
                .vehicleId(vehicle != null ? vehicle.getId() : null)
                .vehicleName(vehicle != null && vehicle.getName() != null ? vehicle.getName().trim() : null)
                .renterId(renter != null ? renter.getId() : null)
                .renterEmail(renter != null ? renter.getEmail() : null)
                .renterDisplayName(displayName.isBlank() ? null : displayName)
                .vehicleRating(fb.getVehicleRating())
                .comment(fb.getComment())
                .photoUrls(photos.isEmpty() ? List.of() : new ArrayList<>(photos))
                .createdAt(fb.getCreatedAt() != null
                        ? fb.getCreatedAt().toInstant(ZoneOffset.UTC)
                        : null)
                .build();
    }

    private static String renterDisplayName(User renter) {
        if (renter == null) {
            return "";
        }
        String first = renter.getFirstName() != null ? renter.getFirstName().trim() : "";
        String last = renter.getLastName() != null ? renter.getLastName().trim() : "";
        return (first + " " + last).trim();
    }
}
