package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.OwnerVehicleRequestStatus;
import com.example.ungdunggoixe.common.VehiclePolicyTerm;
import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.configuration.RedisConfiguration;
import com.example.ungdunggoixe.dto.request.CreateVehicleRequest;
import com.example.ungdunggoixe.dto.request.UpdateVehicleRequest;
import com.example.ungdunggoixe.dto.response.CreateVehicleResponse;
import com.example.ungdunggoixe.dto.response.PageResponse;
import com.example.ungdunggoixe.entity.OwnerVehicleRequest;
import com.example.ungdunggoixe.entity.Station;
import com.example.ungdunggoixe.entity.Vehicle;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.mapper.VehicleMapper;
import com.example.ungdunggoixe.repository.OwnerVehicleRequestRepository;
import com.example.ungdunggoixe.repository.StationRepository;
import com.example.ungdunggoixe.repository.VehicleRepository;
import com.example.ungdunggoixe.repository.specification.VehicleSpecs;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public interface VehicleService {
    CreateVehicleResponse create(CreateVehicleRequest request);
    List<CreateVehicleResponse> searchVehicles( Long stationId, VehicleStatus status, FuelType fuelType, String brand, Integer minCapacity, BigDecimal minPrice, BigDecimal maxPrice );
    PageResponse<CreateVehicleResponse> getVehiclesPaged( int page, int size, String sortBy, String sortDir, Long stationId, VehicleStatus status, FuelType fuelType, String keyword );
    CreateVehicleResponse getVehicleById(Long id);
    CreateVehicleResponse updateVehicle(Long id, UpdateVehicleRequest request);
    String deleteVehicle(Long id);
    String addVehiclePhoto(Long vehicleId, MultipartFile file, Long userId, List<String> jwtRoleAuthorities);
}
