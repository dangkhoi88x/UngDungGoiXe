package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.common.StationStatus;
import com.example.ungdunggoixe.configuration.RedisConfiguration;
import com.example.ungdunggoixe.dto.request.CreateStationRequest;
import com.example.ungdunggoixe.dto.request.UpdateStationRequest;
import com.example.ungdunggoixe.dto.response.CreateStationResponse;
import com.example.ungdunggoixe.dto.response.PageResponse;
import com.example.ungdunggoixe.dto.response.StationResponse;
import com.example.ungdunggoixe.entity.Station;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.mapper.StationMapper;
import com.example.ungdunggoixe.repository.StationRepository;
import com.example.ungdunggoixe.repository.specification.StationSpecs;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public interface StationService {
    CreateStationResponse createStation(CreateStationRequest request);
    StationResponse getStationbyID(Long id);
    List<StationResponse> getAllStation();
    PageResponse<StationResponse> getStationsPaged( int page, int size, String sortBy, String sortDir, StationStatus status, String keyword );
    StationResponse updateStation(Long id, UpdateStationRequest request);
    String deleteStation(Long id);
}
