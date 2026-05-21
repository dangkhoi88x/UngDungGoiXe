package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.StationStatus;
import com.example.ungdunggoixe.dto.request.CreateStationRequest;
import com.example.ungdunggoixe.dto.request.UpdateStationRequest;
import com.example.ungdunggoixe.dto.response.CreateStationResponse;
import com.example.ungdunggoixe.dto.response.PageResponse;
import com.example.ungdunggoixe.dto.response.StationResponse;

import java.util.List;

public interface StationService {
    CreateStationResponse createStation(CreateStationRequest request);
    StationResponse getStationbyID(Long id);
    List<StationResponse> getAllStation();
    PageResponse<StationResponse> getStationsPaged( int page, int size, String sortBy, String sortDir, StationStatus status, String keyword );
    StationResponse updateStation(Long id, UpdateStationRequest request);
    String deleteStation(Long id);
}
