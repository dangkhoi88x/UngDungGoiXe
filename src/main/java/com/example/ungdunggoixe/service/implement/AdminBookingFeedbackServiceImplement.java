package com.example.ungdunggoixe.service.implement;

import com.example.ungdunggoixe.service.*;

import com.example.ungdunggoixe.dto.response.AdminBookingFeedbackRowResponse;
import com.example.ungdunggoixe.dto.response.PageResponse;
import com.example.ungdunggoixe.entity.Booking;
import com.example.ungdunggoixe.entity.Feedback;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.entity.Vehicle;
import com.example.ungdunggoixe.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminBookingFeedbackServiceImplement implements AdminBookingFeedbackService {

    private final FeedbackRepository feedbackRepository;
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("createdAt", "vehicleRating", "id");

    @Transactional(readOnly = true)
    public PageResponse<AdminBookingFeedbackRowResponse> list(
            int page,
            int size,
            String sortBy,
            String sortDir,
            String keyword,
            Integer minRating,
            Boolean hasPhotos
    ) {
        String normalizedSortBy = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "createdAt";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, Sort.by(direction, normalizedSortBy));
        String normalizedKeyword = keyword == null || keyword.trim().isEmpty() ? null : keyword.trim();

        Page<Feedback> pageData = feedbackRepository.searchAdminFeedbacks(
                normalizedKeyword,
                minRating,
                hasPhotos,
                pageable
        );
        List<AdminBookingFeedbackRowResponse> rows = pageData.getContent().stream()
                .map(this::toRow)
                .toList();
        return PageResponse.<AdminBookingFeedbackRowResponse>builder()
                .content(rows)
                .totalElements(pageData.getTotalElements())
                .totalPages(pageData.getTotalPages())
                .page(pageData.getNumber())
                .size(pageData.getSize())
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
                .createdBy(fb.getCreatedBy())
                .updatedBy(fb.getUpdatedBy())
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
