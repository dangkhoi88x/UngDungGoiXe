package com.example.ungdunggoixe.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmitBookingVehicleFeedbackRequest {
    /** Điểm đánh giá xe (1.0 – 5.0). */
    private Double vehicleRating;
    /** Ghi chú tùy chọn của khách. */
    private String comment;
    /**
     * URL ảnh (S3), lấy qua {@code POST /bookings/{id}/feedback/photos}.
     * Tuỳ chọn; tối đa 8 URL.
     */
    private List<String> photoUrls;
}
