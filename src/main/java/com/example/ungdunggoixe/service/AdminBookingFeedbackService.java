package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.dto.response.AdminBookingFeedbackRowResponse;
import com.example.ungdunggoixe.dto.response.PageResponse;
import com.example.ungdunggoixe.entity.Booking;
import com.example.ungdunggoixe.entity.Feedback;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.entity.Vehicle;
import com.example.ungdunggoixe.repository.FeedbackRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public interface AdminBookingFeedbackService {
    PageResponse<AdminBookingFeedbackRowResponse> list( int page, int size, String sortBy, String sortDir, String keyword, Integer minRating, Boolean hasPhotos );
}
