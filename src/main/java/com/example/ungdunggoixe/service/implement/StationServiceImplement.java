package com.example.ungdunggoixe.service.implement;

import com.example.ungdunggoixe.service.*;

import com.example.ungdunggoixe.exception.ErrorCode;
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
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheConfig;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@CacheConfig(cacheNames = RedisConfiguration.STATION_INFO_CACHE)
public class StationServiceImplement implements StationService {

    private static final String ALL_STATIONS_CACHE_KEY = "'all'";
    private static final Set<String> STATION_SORT_FIELDS = Set.of(
            "id", "name", "address", "hotline", "status", "rating", "createdAt", "updatedAt"
    );

    private final StationRepository stationRepository;
    private final I18nService i18nService;

    private static String mapStationSortProperty(String sortBy) {
        if (sortBy == null || sortBy.isBlank() || !STATION_SORT_FIELDS.contains(sortBy)) {
            return "id";
        }
        return sortBy;
    }

    private static Specification<Station> buildStationSpec(StationStatus status, String keyword) {
        return StationSpecs.alwaysTrue()
                .and(StationSpecs.statusEquals(status))
                .and(StationSpecs.keywordContains(keyword));
    }

    @CacheEvict(key = ALL_STATIONS_CACHE_KEY)
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

    @Cacheable(key = "#id.toString()")
    public StationResponse getStationbyID(Long id) {
        return stationRepository.findById(id)
                .map(StationMapper.INSTANCE::toStationResponse)
                .orElseThrow(() -> new AppException(ErrorCode.STATION_NOT_FOUND));

    }

    @Cacheable(key = ALL_STATIONS_CACHE_KEY)
    public List<StationResponse> getAllStation() {
        List<Station> stations = stationRepository.findAll();
        return new ArrayList<>(stations.stream()
                .map(StationMapper.INSTANCE::toStationResponse)
                .toList());
    }

    @Transactional(readOnly = true)
    public PageResponse<StationResponse> getStationsPaged(
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

        Specification<Station> spec = buildStationSpec(status, keyword);
        Page<Station> result = stationRepository.findAll(spec, pageable);
        Page<StationResponse> mapped = result.map(StationMapper.INSTANCE::toStationResponse);
        return PageResponse.<StationResponse>builder()
                .content(mapped.getContent())
                .totalElements(mapped.getTotalElements())
                .totalPages(mapped.getTotalPages())
                .page(mapped.getNumber())
                .size(mapped.getSize())
                .build();
    }

    @Caching(evict = {
            @CacheEvict(key = "#id.toString()"),
            @CacheEvict(key = ALL_STATIONS_CACHE_KEY)
    })
    public StationResponse updateStation(Long id, UpdateStationRequest request) {
        Station station = stationRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.STATION_NOT_FOUND));
        // Merge bỏ qua null; latitude/longitude xử lý riêng (cho phép xóa qua clearCoordinates).
        StationMapper.INSTANCE.updateEntity(request, station);

        if (Boolean.TRUE.equals(request.getClearCoordinates())) {
            station.setLatitude(null);
            station.setLongitude(null);
        } else {
            if (request.getLatitude() != null) {
                station.setLatitude(request.getLatitude());
            }
            if (request.getLongitude() != null) {
                station.setLongitude(request.getLongitude());
            }
        }

        // nếu không dùng @UpdateTimestamp thì set thủ công
        station.setUpdatedAt(LocalDateTime.now());

        // save DB
        Station updatedStation = stationRepository.save(station);

        // map sang response
        return StationMapper.INSTANCE.toStationResponse(updatedStation);

    }

    @Caching(evict = {
            @CacheEvict(key = "#id.toString()"),
            @CacheEvict(key = ALL_STATIONS_CACHE_KEY)
    })
    public String deleteStation(Long id) {
        Station station = stationRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.STATION_NOT_FOUND));
        station.setStatus(StationStatus.INACTIVE);
        stationRepository.save(station);
        return i18nService.getMessage("response.station.delete.success");
    }
}
