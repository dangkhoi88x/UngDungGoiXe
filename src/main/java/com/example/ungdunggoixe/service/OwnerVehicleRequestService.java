package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.OwnerVehicleRequestStatus;
import com.example.ungdunggoixe.dto.request.CreateOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.request.UpdateOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.response.BookingResponse;
import com.example.ungdunggoixe.dto.response.OwnerVehicleRequestResponse;

import java.util.List;

public interface OwnerVehicleRequestService {
    OwnerVehicleRequestResponse create(CreateOwnerVehicleRequest request);
    List<OwnerVehicleRequestResponse> getMyRequests();
    OwnerVehicleRequestResponse getMyRequestById(Long id);
    List<BookingResponse> getMyApprovedVehicleBookings(Long requestId);
    OwnerVehicleRequestResponse updateMyRequest(Long id, UpdateOwnerVehicleRequest request);
    OwnerVehicleRequestResponse resubmit(Long id);
    OwnerVehicleRequestResponse cancel(Long id);
    List<OwnerVehicleRequestResponse> getAdminRequests(OwnerVehicleRequestStatus status);
    OwnerVehicleRequestResponse getAdminRequestById(Long id);
    OwnerVehicleRequestResponse approve(Long id, String adminNote);
    OwnerVehicleRequestResponse reject(Long id, String adminNote);
    OwnerVehicleRequestResponse needMoreInfo(Long id, String adminNote);
}
