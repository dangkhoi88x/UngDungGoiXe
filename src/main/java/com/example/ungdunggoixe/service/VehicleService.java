package com.example.ungdunggoixe.service;


import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.dto.request.CreateVehicleRequest;
import com.example.ungdunggoixe.dto.response.CreateVehicleResponse;
import com.example.ungdunggoixe.entity.Station;
import com.example.ungdunggoixe.entity.Vehicle;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.mapper.VehicleMapper;
import com.example.ungdunggoixe.repository.StationRepository;
import com.example.ungdunggoixe.repository.VehicleRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class VehicleService {
    private final VehicleRepository vehicleRepository;
    private final StationRepository stationRepository;

    @Transactional
    public CreateVehicleResponse create(CreateVehicleRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }

        String licensePlate = request.getLicensePlate();
        if (licensePlate == null || licensePlate.trim().isEmpty()) {
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }

        if (vehicleRepository.existsByLicensePlate(licensePlate)) {
            throw new AppException(ErrorCode.VEHICLE_LICENSE_PLATE_ALREADY_EXISTS);
        }

        Station requestStation = request.getStation();
        if (requestStation == null || requestStation.getId() == null) {
            throw new AppException(ErrorCode.STATION_NOT_FOUND);
        }

        Station station = stationRepository.findById(requestStation.getId())
                .orElseThrow(() -> new AppException(ErrorCode.STATION_NOT_FOUND));

        Vehicle vehicle = VehicleMapper.INSTANCE.toVehicle(request);
        vehicle.setStation(station); // ensure managed entity instance

        if (vehicle.getRating() == null) {
            vehicle.setRating(0.0);
        }
        if (vehicle.getPhotos() == null) {
            vehicle.setPhotos(new ArrayList<>());
        }
        if (vehicle.getPolicies() == null) {
            vehicle.setPolicies(new ArrayList<>());
        }

        Vehicle saved = vehicleRepository.save(vehicle);
        return VehicleMapper.INSTANCE.toCreateVehicleResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CreateVehicleResponse> getVehicles(Long stationId, VehicleStatus status, FuelType fuelType) {
        return vehicleRepository.findAll().stream()
                .filter(v -> stationId == null || v.getStation().getId().equals(stationId))
                .filter(v -> status == null || v.getStatus() == status)
                .filter(v -> fuelType == null || v.getFuelType() == fuelType)
                .map(VehicleMapper.INSTANCE::toCreateVehicleResponse)
                .toList();
    }
}
