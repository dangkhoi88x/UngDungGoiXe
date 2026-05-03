package com.example.ungdunggoixe.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/** Đánh giá xe hiển thị công khai trên trang chi tiết xe (ẩn danh nhẹ). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehiclePublicFeedbackRowResponse {
    private Long id;
    private Double vehicleRating;
    private String comment;
    private List<String> photoUrls;
    private Instant createdAt;
    /** Ví dụ: "Nguyễn A." — không lộ email. */
    private String reviewerLabel;
}
