package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.common.StationStatus;
import com.example.ungdunggoixe.dto.request.CreateStationRequest;
import com.example.ungdunggoixe.dto.request.UpdateStationRequest;
import com.example.ungdunggoixe.dto.response.CreateStationResponse;
import com.example.ungdunggoixe.dto.response.PagedStationResponse;
import com.example.ungdunggoixe.dto.response.StationResponse;
import com.example.ungdunggoixe.entity.Station;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.mapper.StationMapper;
import com.example.ungdunggoixe.repository.StationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class StationService {
    private static final Set<String> STATION_SORT_FIELDS = Set.of(
            "id", "name", "address", "hotline", "status", "rating", "createdAt", "updatedAt"
    );

    private final StationRepository stationRepository;

    private static String mapStationSortProperty(String sortBy) {
        if (sortBy == null || sortBy.isBlank() || !STATION_SORT_FIELDS.contains(sortBy)) {
            return "id";
        }
        return sortBy;
    }

    public CreateStationResponse createStation(CreateStationRequest request) {
        String name = request.getName();
        if (stationRepository.existsByName(name)) {
            throw new AppException(ErrorCode.STATION_NAME_ALREADY_EXISTS);
        }
        Station station = StationMapper.INSTANCE.toStation(request);
        station.setStatus(StationStatus.ACTIVE);
        station.setRating(0.0);
        station.setCreatedAt(LocalDateTime.now());
        stationRepository.save(station);
        return StationMapper.INSTANCE.toCreateStationResponse(station);
    }

    public StationResponse getStationbyID(Long id) {
        return stationRepository.findById(id)
                .map(StationMapper.INSTANCE::toStationResponse)
                .orElseThrow(() -> new AppException(ErrorCode.STATION_NOT_FOUND));

    }

    public List<StationResponse> getAllStation() {
        List<Station> stations = stationRepository.findAll();
        return stations.stream()
                .map(StationMapper.INSTANCE::toStationResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PagedStationResponse getStationsPaged(
            int page,
            int size,
            String sortBy,
            String sortDir,
            StationStatus status,
            String keyword
    ) {
        String property = mapStationSortProperty(sortBy);
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, property));

        String kw = keyword != null ? keyword : "";
        Page<Station> result = stationRepository.findAdminPage(status, kw, pageable);
        Page<StationResponse> mapped = result.map(StationMapper.INSTANCE::toStationResponse);
        return PagedStationResponse.builder()
                .content(mapped.getContent())
                .totalElements(mapped.getTotalElements())
                .totalPages(mapped.getTotalPages())
                .page(mapped.getNumber())
                .size(mapped.getSize())
                .build();
    }

    public StationResponse updateStation(Long id, UpdateStationRequest request) {
        Station station = stationRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.STATION_NOT_FOUND));
        // 🔥 dùng mapper để update (auto ignore null)
        StationMapper.INSTANCE.updateEntity(request, station);

        // nếu không dùng @UpdateTimestamp thì set thủ công
        station.setUpdatedAt(LocalDateTime.now());

        // save DB
        Station updatedStation = stationRepository.save(station);

        // map sang response
        return StationMapper.INSTANCE.toStationResponse(updatedStation);

    }

    public String deleteStation(Long id) {
        Station station = stationRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.STATION_NOT_FOUND));
        station.setStatus(StationStatus.INACTIVE);
        stationRepository.save(station);
        return "Delete successfully";
    }
}
