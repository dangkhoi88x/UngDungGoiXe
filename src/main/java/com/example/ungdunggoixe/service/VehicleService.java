package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.dto.request.CreateVehicleRequest;
import com.example.ungdunggoixe.dto.request.UpdateVehicleRequest;
import com.example.ungdunggoixe.dto.response.CreateVehicleResponse;
import com.example.ungdunggoixe.dto.response.PageResponse;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

public interface VehicleService {
    CreateVehicleResponse create(CreateVehicleRequest request);
    List<CreateVehicleResponse> searchVehicles( Long stationId, VehicleStatus status, FuelType fuelType, String brand, Integer minCapacity, BigDecimal minPrice, BigDecimal maxPrice );
    PageResponse<CreateVehicleResponse> getVehiclesPaged( int page, int size, String sortBy, String sortDir, Long stationId, VehicleStatus status, FuelType fuelType, String keyword );
    CreateVehicleResponse getVehicleById(Long id);
    CreateVehicleResponse updateVehicle(Long id, UpdateVehicleRequest request);
    String deleteVehicle(Long id);
    String addVehiclePhoto(Long vehicleId, MultipartFile file, Long userId, List<String> jwtRoleAuthorities);
}
