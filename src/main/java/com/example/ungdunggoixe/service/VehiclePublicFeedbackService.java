package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.dto.response.PageResponse;
import com.example.ungdunggoixe.dto.response.VehiclePublicFeedbackRowResponse;
import org.springframework.data.domain.Pageable;

public interface VehiclePublicFeedbackService {
    PageResponse<VehiclePublicFeedbackRowResponse> listForVehicle(Long vehicleId, Pageable pageable);
}
