package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.dto.response.PagedVehiclePublicFeedbackResponse;
import com.example.ungdunggoixe.dto.response.VehiclePublicFeedbackRowResponse;
import com.example.ungdunggoixe.entity.Feedback;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.repository.FeedbackRepository;
import com.example.ungdunggoixe.repository.VehicleRepository;
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
public class VehiclePublicFeedbackService {

    private final VehicleRepository vehicleRepository;
    private final FeedbackRepository feedbackRepository;

    @Transactional(readOnly = true)
    public PagedVehiclePublicFeedbackResponse listForVehicle(Long vehicleId, Pageable pageable) {
        if (!vehicleRepository.existsById(vehicleId)) {
            throw new AppException(ErrorCode.VEHICLE_NOT_FOUND);
        }
        Page<Feedback> page = feedbackRepository.findByBooking_Vehicle_IdOrderByCreatedAtDesc(vehicleId, pageable);
        List<VehiclePublicFeedbackRowResponse> rows = page.getContent().stream()
                .map(this::toRow)
                .toList();
        return PagedVehiclePublicFeedbackResponse.builder()
                .content(rows)
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .page(page.getNumber())
                .size(page.getSize())
                .build();
    }

    private VehiclePublicFeedbackRowResponse toRow(Feedback fb) {
        User renter = fb.getRenter();
        List<String> photos = fb.getPhotoUrls() != null ? fb.getPhotoUrls() : List.of();
        return VehiclePublicFeedbackRowResponse.builder()
                .id(fb.getId())
                .vehicleRating(fb.getVehicleRating())
                .comment(fb.getComment())
                .photoUrls(photos.isEmpty() ? List.of() : new ArrayList<>(photos))
                .createdAt(fb.getCreatedAt() != null
                        ? fb.getCreatedAt().toInstant(ZoneOffset.UTC)
                        : null)
                .reviewerLabel(reviewerLabel(renter))
                .build();
    }

    private static String reviewerLabel(User renter) {
        if (renter == null) {
            return "Khách";
        }
        String first = renter.getFirstName() != null ? renter.getFirstName().trim() : "";
        String last = renter.getLastName() != null ? renter.getLastName().trim() : "";
        if (first.isEmpty() && last.isEmpty()) {
            return "Khách";
        }
        if (last.isEmpty()) {
            return first;
        }
        String initial = last.substring(0, 1).toUpperCase() + ".";
        return (first.isEmpty() ? "" : first + " ") + initial;
    }
}
