package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.common.StationStatus;
import com.example.ungdunggoixe.dto.request.CreateStationRequest;
import com.example.ungdunggoixe.dto.request.UpdateStationRequest;
import com.example.ungdunggoixe.dto.response.CreateStationResponse;
import com.example.ungdunggoixe.dto.response.StationResponse;
import com.example.ungdunggoixe.entity.Station;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.mapper.StationMapper;
import com.example.ungdunggoixe.repository.StationRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StationService {
    private final StationRepository stationRepository;

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

    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public String deleteStation(Long id) {
        Station station = stationRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.STATION_NOT_FOUND));
        station.setStatus(StationStatus.INACTIVE);
        stationRepository.save(station);
        return "Delete successfully";
    }
}
