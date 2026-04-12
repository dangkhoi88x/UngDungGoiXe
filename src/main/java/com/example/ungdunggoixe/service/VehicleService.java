package com.example.ungdunggoixe.service;


import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.dto.request.CreateVehicleRequest;
import com.example.ungdunggoixe.dto.request.UpdateVehicleRequest;
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

import java.math.BigDecimal;
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

        // ── Dùng stationId thay vì station object ──

        Long stationId = request.getStationId();
        if (stationId == null) {
            throw new AppException(ErrorCode.STATION_NOT_FOUND);
        }
        Station station = stationRepository.findById(stationId)
                .orElseThrow(() -> new AppException(ErrorCode.STATION_NOT_FOUND));

        Vehicle vehicle = VehicleMapper.INSTANCE.toVehicle(request);
        vehicle.setStation(station);

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

    // ═══════════════════════════════════════════════════════
    // SEARCH XE NÂNG CAO
    // ═══════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<CreateVehicleResponse> searchVehicles(
            Long stationId,
            VehicleStatus status,
            FuelType fuelType,
            String brand,
            Integer minCapacity,
            BigDecimal minPrice,
            BigDecimal maxPrice
    ) {
        return vehicleRepository.searchVehicles(
                stationId, status, fuelType, brand, minCapacity, minPrice, maxPrice
        ).stream()
                .map(VehicleMapper.INSTANCE::toCreateVehicleResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CreateVehicleResponse getVehicleById(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));
        return VehicleMapper.INSTANCE.toCreateVehicleResponse(vehicle);
    }

    @Transactional
    public CreateVehicleResponse updateVehicle(Long id, UpdateVehicleRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }

        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));

        if (request.getLicensePlate() != null && !request.getLicensePlate().trim().isEmpty()) {
            boolean duplicated = vehicleRepository.existsByLicensePlateAndIdNot(request.getLicensePlate(), id);
            if (duplicated) {
                throw new AppException(ErrorCode.VEHICLE_LICENSE_PLATE_ALREADY_EXISTS);
            }
        }

        // ── Dùng stationId thay vì station object ──
        if (request.getStationId() != null) {
            Station station = stationRepository.findById(request.getStationId())
                    .orElseThrow(() -> new AppException(ErrorCode.STATION_NOT_FOUND));
            vehicle.setStation(station);
        }

        VehicleMapper.INSTANCE.updateEntity(request, vehicle);
        Vehicle updatedVehicle = vehicleRepository.save(vehicle);
        return VehicleMapper.INSTANCE.toCreateVehicleResponse(updatedVehicle);
    }

    @Transactional
    public String deleteVehicle(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));
        vehicleRepository.delete(vehicle);
        return "Vehicle has been deleted";
    }
}
