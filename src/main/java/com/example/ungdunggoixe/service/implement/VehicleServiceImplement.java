package com.example.ungdunggoixe.service.implement;

import com.example.ungdunggoixe.service.*;


import com.example.ungdunggoixe.exception.ErrorCode;
import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.OwnerVehicleRequestStatus;
import com.example.ungdunggoixe.common.VehiclePolicyTerm;
import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.configuration.RedisConfiguration;
import com.example.ungdunggoixe.constant.FileUploadConstants;
import com.example.ungdunggoixe.constant.SecurityConstants;
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
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheConfig;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@CacheConfig(cacheNames = RedisConfiguration.VEHICLE_INFO_CACHE)
public class VehicleServiceImplement implements VehicleService {
    private static final Set<String> VEHICLE_SORT_FIELDS = Set.of(
            "id", "licensePlate", "name", "brand", "status", "fuelType", "capacity", "rentCount",
            "hourlyRate", "dailyRate", "depositAmount", "rating", "createdAt", "updatedAt", "stationId"
    );

    private final VehicleRepository vehicleRepository;
    private final OwnerVehicleRequestRepository ownerVehicleRequestRepository;
    private final StationRepository stationRepository;
    private final I18nService i18nService;
    private final MediaService mediaService;

    /** Đồng bộ với {@code app.owner-vehicle-upload.max-file-size-bytes} (và spring.servlet.multipart max-file-size). */
    @Value("${app.owner-vehicle-upload.max-file-size-bytes:6291456}")
    private long maxVehiclePhotoUploadBytes;

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

    private static Specification<Vehicle> buildVehicleSpec(
            Long stationId,
            VehicleStatus status,
            FuelType fuelType,
            String brand,
            Integer minCapacity,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String keyword
    ) {
        Long normalizedStationId = stationId != null && stationId > 0 ? stationId : null;
        return Specification.where(VehicleSpecs.stationIdEquals(normalizedStationId))
                .and(VehicleSpecs.statusEquals(status))
                .and(VehicleSpecs.fuelTypeEquals(fuelType))
                .and(VehicleSpecs.brandContains(brand))
                .and(VehicleSpecs.minCapacity(minCapacity))
                .and(VehicleSpecs.minPrice(minPrice))
                .and(VehicleSpecs.maxPrice(maxPrice))
                .and(VehicleSpecs.keywordContains(keyword));
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
        Specification<Vehicle> spec = buildVehicleSpec(
                stationId,
                status,
                fuelType,
                brand,
                minCapacity,
                minPrice,
                maxPrice,
                null
        );
        Sort sort = Sort.by(
                Sort.Order.desc("rating"),
                Sort.Order.desc("rentCount"),
                Sort.Order.desc("id")
        );
        return vehicleRepository.findAll(spec, sort).stream()
                .map(VehicleMapper.INSTANCE::toCreateVehicleResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<CreateVehicleResponse> getVehiclesPaged(
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
        Specification<Vehicle> spec = buildVehicleSpec(
                stationId,
                status,
                fuelType,
                null,
                null,
                null,
                null,
                keyword
        );
        Page<Vehicle> result = vehicleRepository.findAll(spec, pageable);
        Page<CreateVehicleResponse> mapped = result.map(VehicleMapper.INSTANCE::toCreateVehicleResponse);
        return PageResponse.<CreateVehicleResponse>builder()
                .content(mapped.getContent())
                .totalElements(mapped.getTotalElements())
                .totalPages(mapped.getTotalPages())
                .page(mapped.getNumber())
                .size(mapped.getSize())
                .build();
    }

    @Transactional(readOnly = true)
    @Cacheable(key = "#id.toString()")
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
    @CacheEvict(key = "#id.toString()")
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
    @CacheEvict(key = "#id.toString()")
    public String deleteVehicle(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));
        vehicleRepository.delete(vehicle);
        return i18nService.getMessage("response.vehicle.delete.success");
    }

    /**
     * Upload ảnh xe lên AWS S3 và append URL vào {@link Vehicle#getPhotos()}.
     * Admin / super-admin: mọi xe. Chu xe: chỉ khi có hồ sơ duyệt (owner vehicle request) gắn {@code approved_vehicle_id} = vehicleId và đúng owner.
     */
    @Transactional
    @CacheEvict(key = "#vehicleId.toString()")
    public String addVehiclePhoto(Long vehicleId, MultipartFile file, Long userId, List<String> jwtRoleAuthorities) {
        validateVehiclePhoto(file);
        boolean allowed = isAdminRole(jwtRoleAuthorities)
                || isApprovedOwnerOfVehicle(userId, vehicleId);
        if (!allowed) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));
        String url;
        try {
            url = mediaService.uploadVehiclePhotoToS3(file, "vehicles/" + vehicleId);
        } catch (IOException e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }
        if (url == null || url.isBlank()) {
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }
        if (vehicle.getPhotos() == null) {
            vehicle.setPhotos(new ArrayList<>());
        }
        vehicle.getPhotos().add(url);
        vehicleRepository.save(vehicle);
        return url;
    }

    private static boolean isAdminRole(List<String> jwtRoleAuthorities) {
        if (jwtRoleAuthorities == null || jwtRoleAuthorities.isEmpty()) {
            return false;
        }
        return jwtRoleAuthorities.stream().anyMatch(SecurityConstants.ADMIN_AUTHORITIES::contains);
    }

    private boolean isApprovedOwnerOfVehicle(Long userId, Long vehicleId) {
        return ownerVehicleRequestRepository
                .findFirstByApprovedVehicleIdOrderByCreatedAtDesc(vehicleId)
                .filter(this::isApprovedRequestWithOwner)
                .map(OwnerVehicleRequest::getOwner)
                .filter(o -> o != null && userId.equals(o.getId()))
                .isPresent();
    }

    private boolean isApprovedRequestWithOwner(OwnerVehicleRequest req) {
        return req.getStatus() == OwnerVehicleRequestStatus.APPROVED
                && req.getApprovedVehicle() != null
                && req.getOwner() != null;
    }

    private void validateVehiclePhoto(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
        if (file.getSize() > maxVehiclePhotoUploadBytes) {
            throw new AppException(ErrorCode.FILE_UPLOAD_TOO_LARGE);
        }
        String contentType = file.getContentType();
        if (contentType == null) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
        String normalized = contentType.toLowerCase(Locale.ROOT);
        if (!FileUploadConstants.IMAGE_TYPES.contains(normalized)) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
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
