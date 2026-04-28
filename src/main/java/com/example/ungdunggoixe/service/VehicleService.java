package com.example.ungdunggoixe.service;


import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.OwnerVehicleRequestStatus;
import com.example.ungdunggoixe.common.VehiclePolicyTerm;
import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.dto.request.CreateVehicleRequest;
import com.example.ungdunggoixe.dto.request.UpdateVehicleRequest;
import com.example.ungdunggoixe.dto.response.CreateVehicleResponse;
import com.example.ungdunggoixe.dto.response.PagedVehicleResponse;
import com.example.ungdunggoixe.entity.Station;
import com.example.ungdunggoixe.entity.Vehicle;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.mapper.VehicleMapper;
import com.example.ungdunggoixe.repository.OwnerVehicleRequestRepository;
import com.example.ungdunggoixe.repository.StationRepository;
import com.example.ungdunggoixe.repository.VehicleRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@AllArgsConstructor
public class VehicleService {
    private static final Set<String> VEHICLE_SORT_FIELDS = Set.of(
            "id", "licensePlate", "name", "brand", "status", "fuelType", "capacity", "rentCount",
            "hourlyRate", "dailyRate", "depositAmount", "rating", "createdAt", "updatedAt", "stationId"
    );

    private final VehicleRepository vehicleRepository;
    private final OwnerVehicleRequestRepository ownerVehicleRequestRepository;
    private final StationRepository stationRepository;
    private final I18nService i18nService;

    private static String mapVehicleSortProperty(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return "id";
        }
        if (!VEHICLE_SORT_FIELDS.contains(sortBy)) {
            return "id";
        }
        if ("stationId".equals(sortBy)) {
            return "station.id";
        }
        return sortBy;
    }

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
        if (request.getPolicies() != null) {
            vehicle.setPolicies(normalizePolicies(request.getPolicies()));
        }

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
    public PagedVehicleResponse getVehiclesPaged(
            int page,
            int size,
            String sortBy,
            String sortDir,
            Long stationId,
            VehicleStatus status,
            FuelType fuelType,
            String keyword
    ) {
        String property = mapVehicleSortProperty(sortBy);
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, property));

        Long sid = stationId != null && stationId > 0 ? stationId : null;
        String kw = keyword != null ? keyword : "";

        Page<Vehicle> result = vehicleRepository.findAdminPage(sid, status, fuelType, kw, pageable);
        Page<CreateVehicleResponse> mapped = result.map(VehicleMapper.INSTANCE::toCreateVehicleResponse);
        return PagedVehicleResponse.builder()
                .content(mapped.getContent())
                .totalElements(mapped.getTotalElements())
                .totalPages(mapped.getTotalPages())
                .page(mapped.getNumber())
                .size(mapped.getSize())
                .build();
    }

    @Transactional(readOnly = true)
    public CreateVehicleResponse getVehicleById(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));
        CreateVehicleResponse response = VehicleMapper.INSTANCE.toCreateVehicleResponse(vehicle);
        String ownerEmail = ownerVehicleRequestRepository.findFirstByApprovedVehicleIdOrderByCreatedAtDesc(id)
                .map(req -> req.getOwner() != null ? req.getOwner().getEmail() : null)
                .orElseGet(() -> ownerVehicleRequestRepository
                        .findFirstByLicensePlateAndStatusOrderByCreatedAtDesc(
                                vehicle.getLicensePlate(),
                                OwnerVehicleRequestStatus.APPROVED
                        )
                        .map(req -> req.getOwner() != null ? req.getOwner().getEmail() : null)
                        .orElse(null));
        response.setOwnerEmail(ownerEmail);
        return response;
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
        if (request.getPolicies() != null) {
            vehicle.setPolicies(normalizePolicies(request.getPolicies()));
        }
        Vehicle updatedVehicle = vehicleRepository.save(vehicle);
        return VehicleMapper.INSTANCE.toCreateVehicleResponse(updatedVehicle);
    }

    @Transactional
    public String deleteVehicle(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));
        vehicleRepository.delete(vehicle);
        return i18nService.getMessage("response.vehicle.delete.success");
    }

    private List<String> normalizePolicies(List<String> policies) {
        if (policies == null || policies.isEmpty()) {
            return new ArrayList<>();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String raw : policies) {
            VehiclePolicyTerm term = VehiclePolicyTerm.fromInput(raw)
                    .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_POLICY_INVALID));
            normalized.add(term.name());
        }
        return new ArrayList<>(normalized);
    }
}
