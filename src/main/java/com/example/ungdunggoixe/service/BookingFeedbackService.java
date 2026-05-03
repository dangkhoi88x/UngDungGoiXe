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
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class BookingFeedbackService {

    private static final double MIN_RATING = 1.0;
    private static final double MAX_RATING = 5.0;
    private static final int COMMENT_MAX_LEN = 4000;
    private static final int MAX_FEEDBACK_PHOTOS = 8;
    private static final int PHOTO_URL_MAX_LEN = 2048;

    private static final Set<String> FEEDBACK_PHOTO_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp"
    );

    private final FeedbackRepository feedbackRepository;
    private final BookingRepository bookingRepository;
    private final VehicleRepository vehicleRepository;
    private final MediaService mediaService;

    @Value("${cloudinary.cloud-name:}")
    private String cloudinaryCloudName;

    @Value("${app.owner-vehicle-upload.max-file-size-bytes:6291456}")
    private long maxFeedbackPhotoBytes;

    @Transactional(readOnly = true)
    public BookingVehicleFeedbackResponse getMyFeedbackForBooking(Long bookingId, Long renterUserId) {
        Booking booking = loadBookingForRenter(bookingId, renterUserId);
        Feedback fb = feedbackRepository.findByBooking_Id(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.FEEDBACK_NOT_FOUND));
        return toResponse(fb, booking);
    }

    /**
     * Upload một ảnh đánh giá (Cloudinary, folder {@code bookings/{bookingId}/feedback}).
     * Chỉ trước khi gửi feedback; booking phải COMPLETED và chưa có feedback.
     */
    @Transactional(readOnly = true)
    public String uploadFeedbackPhoto(Long bookingId, Long renterUserId, MultipartFile file) {
        Booking booking = requireBookingReadyForPhotoUpload(bookingId, renterUserId);
        validateFeedbackPhotoFile(file);
        try {
            String url = mediaService.upload(file, "bookings/" + booking.getId() + "/feedback");
            if (url == null || url.isBlank()) {
                throw new AppException(ErrorCode.INTERNAL_ERROR);
            }
            return url;
        } catch (IOException e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }
    }

    @Transactional
    public BookingVehicleFeedbackResponse submitVehicleFeedback(
            Long bookingId,
            Long renterUserId,
            SubmitBookingVehicleFeedbackRequest request
    ) {
        if (request == null || request.getVehicleRating() == null) {
            throw new AppException(ErrorCode.FEEDBACK_VEHICLE_RATING_INVALID);
        }
        double rating = request.getVehicleRating();
        if (!Double.isFinite(rating) || rating < MIN_RATING || rating > MAX_RATING) {
            throw new AppException(ErrorCode.FEEDBACK_VEHICLE_RATING_INVALID);
        }

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (!booking.getRenter().getId().equals(renterUserId)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new AppException(ErrorCode.BOOKING_FEEDBACK_NOT_ALLOWED);
        }
        if (feedbackRepository.existsByBooking_Id(bookingId)) {
            throw new AppException(ErrorCode.FEEDBACK_ALREADY_EXISTS);
        }

        String comment = normalizeComment(request.getComment());
        List<String> photoUrls = normalizeAndValidatePhotoUrls(request.getPhotoUrls(), bookingId);

        Feedback saved = feedbackRepository.save(Feedback.builder()
                .booking(booking)
                .renter(booking.getRenter())
                .vehicleRating(rating)
                .stationRating(null)
                .comment(comment)
                .photoUrls(new ArrayList<>(photoUrls))
                .isEdit(false)
                .build());

        refreshVehicleAverageRating(booking.getVehicle().getId());

        return toResponse(saved, booking);
    }

    private Booking loadBookingForRenter(Long bookingId, Long renterUserId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
        if (!booking.getRenter().getId().equals(renterUserId)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        return booking;
    }

    private Booking requireBookingReadyForPhotoUpload(Long bookingId, Long renterUserId) {
        Booking booking = loadBookingForRenter(bookingId, renterUserId);
        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new AppException(ErrorCode.BOOKING_FEEDBACK_NOT_ALLOWED);
        }
        if (feedbackRepository.existsByBooking_Id(bookingId)) {
            throw new AppException(ErrorCode.FEEDBACK_ALREADY_EXISTS);
        }
        return booking;
    }

    private void validateFeedbackPhotoFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
        if (file.getSize() > maxFeedbackPhotoBytes) {
            throw new AppException(ErrorCode.FILE_UPLOAD_TOO_LARGE);
        }
        String contentType = file.getContentType();
        if (contentType == null) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
        if (!FEEDBACK_PHOTO_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
    }

    private List<String> normalizeAndValidatePhotoUrls(List<String> raw, Long bookingId) {
        if (raw == null || raw.isEmpty()) {
            return new ArrayList<>();
        }
        LinkedHashSet<String> unique = new LinkedHashSet<>();
        for (String item : raw) {
            if (item == null) {
                continue;
            }
            String t = item.trim();
            if (t.isEmpty()) {
                continue;
            }
            if (t.length() > PHOTO_URL_MAX_LEN) {
                throw new AppException(ErrorCode.FEEDBACK_PHOTO_URL_INVALID);
            }
            if (!isAllowedFeedbackPhotoUrl(t, bookingId)) {
                throw new AppException(ErrorCode.FEEDBACK_PHOTO_URL_INVALID);
            }
            unique.add(t);
        }
        if (unique.size() > MAX_FEEDBACK_PHOTOS) {
            throw new AppException(ErrorCode.FEEDBACK_PHOTOS_TOO_MANY);
        }
        return new ArrayList<>(unique);
    }

    /**
     * Chỉ chấp nhận URL Cloudinary của đúng cloud và folder feedback của booking này.
     */
    private boolean isAllowedFeedbackPhotoUrl(String url, Long bookingId) {
        try {
            URI u = URI.create(url.trim().replace(" ", "%20"));
            if (!"https".equalsIgnoreCase(u.getScheme())) {
                return false;
            }
            if (!"res.cloudinary.com".equalsIgnoreCase(u.getHost())) {
                return false;
            }
            if (cloudinaryCloudName != null && !cloudinaryCloudName.isBlank()) {
                String path = u.getPath();
                if (path == null || !path.startsWith("/" + cloudinaryCloudName + "/")) {
                    return false;
                }
            }
            String marker = "/bookings/" + bookingId + "/feedback";
            return u.getPath() != null && u.getPath().contains(marker);
        } catch (Exception e) {
            return false;
        }
    }

    private static String normalizeComment(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim();
        if (t.isEmpty()) {
            return null;
        }
        return t.length() > COMMENT_MAX_LEN ? t.substring(0, COMMENT_MAX_LEN) : t;
    }

    private void refreshVehicleAverageRating(Long vehicleId) {
        Double avg = feedbackRepository.averageVehicleRatingForVehicle(vehicleId);
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));
        if (avg != null && Double.isFinite(avg)) {
            vehicle.setRating(Math.round(avg * 10.0) / 10.0);
        } else {
            vehicle.setRating(0.0);
        }
        vehicleRepository.save(vehicle);
    }

    private static BookingVehicleFeedbackResponse toResponse(Feedback fb, Booking booking) {
        List<String> photos = fb.getPhotoUrls() != null ? fb.getPhotoUrls() : List.of();
        return BookingVehicleFeedbackResponse.builder()
                .id(fb.getId())
                .bookingId(booking.getId())
                .vehicleId(booking.getVehicle().getId())
                .vehicleRating(fb.getVehicleRating())
                .comment(fb.getComment())
                .photoUrls(photos.isEmpty() ? List.of() : new ArrayList<>(photos))
                .createdAt(fb.getCreatedAt() != null
                        ? fb.getCreatedAt().toInstant(ZoneOffset.UTC)
                        : null)
                .build();
    }
}
