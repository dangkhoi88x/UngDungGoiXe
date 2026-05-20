package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.dto.response.PageResponse;
import com.example.ungdunggoixe.dto.response.VehiclePublicFeedbackRowResponse;
import com.example.ungdunggoixe.entity.Feedback;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.repository.FeedbackRepository;
import com.example.ungdunggoixe.repository.VehicleRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

public interface VehiclePublicFeedbackService {
    PageResponse<VehiclePublicFeedbackRowResponse> listForVehicle(Long vehicleId, Pageable pageable);
}
