package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.common.OwnerVehicleRequestStatus;
import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.dto.request.CreateOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.request.UpdateOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.response.OwnerVehicleRequestResponse;
import com.example.ungdunggoixe.entity.OwnerVehicleRequest;
import com.example.ungdunggoixe.entity.Station;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.entity.Vehicle;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.mapper.OwnerVehicleRequestMapper;
import com.example.ungdunggoixe.repository.OwnerVehicleRequestRepository;
import com.example.ungdunggoixe.repository.StationRepository;
import com.example.ungdunggoixe.repository.UserRepository;
import com.example.ungdunggoixe.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OwnerVehicleRequestService {
    private final OwnerVehicleRequestRepository ownerVehicleRequestRepository;
    private final UserRepository userRepository;
    private final StationRepository stationRepository;
    private final VehicleRepository vehicleRepository;

    private static String normalizePlate(String raw) {
        return raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new AppException(ErrorCode.UNAUTHORIZED);
        try {
            return Long.parseLong(auth.getName());
        } catch (NumberFormatException e) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }

    private User requireCurrentUser() {
        Long userId = currentUserId();
        return userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private Station requireStation(Long stationId) {
        if (stationId == null) throw new AppException(ErrorCode.STATION_NOT_FOUND);
        return stationRepository.findById(stationId)
                .orElseThrow(() -> new AppException(ErrorCode.STATION_NOT_FOUND));
    }

    private OwnerVehicleRequest requireById(Long id) {
        return ownerVehicleRequestRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.OWNER_VEHICLE_REQUEST_NOT_FOUND));
    }

    private static List<String> normalizePhotoUrls(List<String> raw) {
        if (raw == null) {
            return new ArrayList<>();
        }
        return raw.stream()
                .filter(s -> s != null)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private static void trimDocumentUrlsOnEntity(OwnerVehicleRequest e) {
        if (e.getRegistrationDocUrl() != null) {
            String t = e.getRegistrationDocUrl().trim();
            e.setRegistrationDocUrl(t.isEmpty() ? null : t);
        }
        if (e.getInsuranceDocUrl() != null) {
            String t = e.getInsuranceDocUrl().trim();
            e.setInsuranceDocUrl(t.isEmpty() ? null : t);
        }
    }

    private void validateSubmissionIntegrity(OwnerVehicleRequest req) {
        List<String> photos = req.getPhotos() == null ? List.of() : req.getPhotos();
        if (photos.size() < 3) {
            throw new AppException(ErrorCode.OWNER_VEHICLE_REQUEST_PHOTOS_INSUFFICIENT);
        }
        String reg = req.getRegistrationDocUrl() == null ? "" : req.getRegistrationDocUrl().trim();
        String ins = req.getInsuranceDocUrl() == null ? "" : req.getInsuranceDocUrl().trim();
        if (reg.isEmpty() || ins.isEmpty()) {
            throw new AppException(ErrorCode.OWNER_VEHICLE_REQUEST_DOCS_REQUIRED);
        }
    }

    private void validateUniquePlateForRequests(String normalizedPlate, Long ignoreRequestId) {
        if (vehicleRepository.existsByLicensePlate(normalizedPlate)) {
            throw new AppException(ErrorCode.VEHICLE_LICENSE_PLATE_ALREADY_EXISTS);
        }
        List<OwnerVehicleRequestStatus> blockingStatuses = List.of(
                OwnerVehicleRequestStatus.PENDING,
                OwnerVehicleRequestStatus.NEED_MORE_INFO,
                OwnerVehicleRequestStatus.APPROVED
        );
        boolean exists = ownerVehicleRequestRepository
                .existsByLicensePlateAndStatusIn(normalizedPlate, blockingStatuses);
        if (!exists) return;

        if (ignoreRequestId == null) {
            throw new AppException(ErrorCode.VEHICLE_LICENSE_PLATE_ALREADY_EXISTS);
        }
        OwnerVehicleRequest current = requireById(ignoreRequestId);
        String currentPlate = normalizePlate(current.getLicensePlate());
        if (!normalizedPlate.equals(currentPlate)) {
            throw new AppException(ErrorCode.VEHICLE_LICENSE_PLATE_ALREADY_EXISTS);
        }
    }

    @Transactional
    public OwnerVehicleRequestResponse create(CreateOwnerVehicleRequest request) {
        if (request == null) throw new AppException(ErrorCode.INTERNAL_ERROR);
        User owner = requireCurrentUser();
        Station station = requireStation(request.getStationId());
        String normalizedPlate = normalizePlate(request.getLicensePlate());
        if (normalizedPlate.isBlank()) {
            throw new AppException(ErrorCode.OWNER_VEHICLE_REQUEST_INVALID);
        }
        validateUniquePlateForRequests(normalizedPlate, null);

        OwnerVehicleRequest entity = OwnerVehicleRequestMapper.INSTANCE.toEntity(request);
        entity.setOwner(owner);
        entity.setStation(station);
        entity.setLicensePlate(normalizedPlate);
        entity.setStatus(OwnerVehicleRequestStatus.PENDING);
        entity.setPhotos(normalizePhotoUrls(request.getPhotos()));
        if (entity.getPolicies() == null) {
            entity.setPolicies(new ArrayList<>());
        }
        trimDocumentUrlsOnEntity(entity);
        validateSubmissionIntegrity(entity);

        return OwnerVehicleRequestMapper.INSTANCE.toResponse(
                ownerVehicleRequestRepository.save(entity)
        );
    }

    @Transactional(readOnly = true)
    public List<OwnerVehicleRequestResponse> getMyRequests() {
        Long ownerId = currentUserId();
        return ownerVehicleRequestRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId)
                .stream()
                .map(OwnerVehicleRequestMapper.INSTANCE::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public OwnerVehicleRequestResponse getMyRequestById(Long id) {
        Long ownerId = currentUserId();
        OwnerVehicleRequest req = requireById(id);
        if (!req.getOwner().getId().equals(ownerId)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        return OwnerVehicleRequestMapper.INSTANCE.toResponse(req);
    }

    @Transactional
    public OwnerVehicleRequestResponse updateMyRequest(Long id, UpdateOwnerVehicleRequest request) {
        Long ownerId = currentUserId();
        OwnerVehicleRequest req = requireById(id);
        if (!req.getOwner().getId().equals(ownerId)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        if (!(req.getStatus() == OwnerVehicleRequestStatus.PENDING
                || req.getStatus() == OwnerVehicleRequestStatus.NEED_MORE_INFO)) {
            throw new AppException(ErrorCode.OWNER_VEHICLE_REQUEST_STATUS_INVALID);
        }

        if (request.getStationId() != null) {
            req.setStation(requireStation(request.getStationId()));
        }
        if (request.getLicensePlate() != null) {
            String normalizedPlate = normalizePlate(request.getLicensePlate());
            if (normalizedPlate.isBlank()) {
                throw new AppException(ErrorCode.OWNER_VEHICLE_REQUEST_INVALID);
            }
            validateUniquePlateForRequests(normalizedPlate, req.getId());
            req.setLicensePlate(normalizedPlate);
        }

        OwnerVehicleRequestMapper.INSTANCE.updateEntity(request, req);
        if (req.getPhotos() == null) {
            req.setPhotos(new ArrayList<>());
        } else {
            req.setPhotos(normalizePhotoUrls(req.getPhotos()));
        }
        if (req.getPolicies() == null) {
            req.setPolicies(new ArrayList<>());
        }
        trimDocumentUrlsOnEntity(req);
        validateSubmissionIntegrity(req);

        return OwnerVehicleRequestMapper.INSTANCE.toResponse(
                ownerVehicleRequestRepository.save(req)
        );
    }

    @Transactional
    public OwnerVehicleRequestResponse resubmit(Long id) {
        Long ownerId = currentUserId();
        OwnerVehicleRequest req = requireById(id);
        if (!req.getOwner().getId().equals(ownerId)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        if (!(req.getStatus() == OwnerVehicleRequestStatus.REJECTED
                || req.getStatus() == OwnerVehicleRequestStatus.NEED_MORE_INFO)) {
            throw new AppException(ErrorCode.OWNER_VEHICLE_REQUEST_STATUS_INVALID);
        }
        validateSubmissionIntegrity(req);
        req.setStatus(OwnerVehicleRequestStatus.PENDING);
        req.setAdminNote(null);
        return OwnerVehicleRequestMapper.INSTANCE.toResponse(
                ownerVehicleRequestRepository.save(req)
        );
    }

    @Transactional(readOnly = true)
    public List<OwnerVehicleRequestResponse> getAdminRequests(OwnerVehicleRequestStatus status) {
        List<OwnerVehicleRequest> list = status == null
                ? ownerVehicleRequestRepository.findAllByOrderByCreatedAtDesc()
                : ownerVehicleRequestRepository.findByStatusOrderByCreatedAtAsc(status);
        return list.stream().map(OwnerVehicleRequestMapper.INSTANCE::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public OwnerVehicleRequestResponse getAdminRequestById(Long id) {
        return OwnerVehicleRequestMapper.INSTANCE.toResponse(requireById(id));
    }

    @Transactional
    public OwnerVehicleRequestResponse approve(Long id, String adminNote) {
        OwnerVehicleRequest req = requireById(id);
        if (req.getStatus() != OwnerVehicleRequestStatus.PENDING
                && req.getStatus() != OwnerVehicleRequestStatus.NEED_MORE_INFO) {
            throw new AppException(ErrorCode.OWNER_VEHICLE_REQUEST_STATUS_INVALID);
        }
        validateSubmissionIntegrity(req);
        String normalizedPlate = normalizePlate(req.getLicensePlate());
        if (vehicleRepository.existsByLicensePlate(normalizedPlate)) {
            throw new AppException(ErrorCode.VEHICLE_LICENSE_PLATE_ALREADY_EXISTS);
        }

        Vehicle vehicle = Vehicle.builder()
                .station(req.getStation())
                .licensePlate(normalizedPlate)
                .name(req.getName())
                .brand(req.getBrand())
                .fuelType(req.getFuelType())
                .rating(0.0)
                .capacity(req.getCapacity())
                .rentCount(0)
                .photos(req.getPhotos() != null ? new ArrayList<>(req.getPhotos()) : new ArrayList<>())
                .status(VehicleStatus.AVAILABLE)
                .policies(req.getPolicies() != null ? new ArrayList<>(req.getPolicies()) : new ArrayList<>())
                .hourlyRate(req.getHourlyRate())
                .dailyRate(req.getDailyRate())
                .depositAmount(req.getDepositAmount())
                .build();
        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        req.setApprovedVehicle(savedVehicle);
        req.setStatus(OwnerVehicleRequestStatus.APPROVED);
        req.setAdminNote(adminNote);
        return OwnerVehicleRequestMapper.INSTANCE.toResponse(
                ownerVehicleRequestRepository.save(req)
        );
    }

    @Transactional
    public OwnerVehicleRequestResponse reject(Long id, String adminNote) {
        OwnerVehicleRequest req = requireById(id);
        if (req.getStatus() == OwnerVehicleRequestStatus.APPROVED
                || req.getStatus() == OwnerVehicleRequestStatus.CANCELLED) {
            throw new AppException(ErrorCode.OWNER_VEHICLE_REQUEST_STATUS_INVALID);
        }
        req.setStatus(OwnerVehicleRequestStatus.REJECTED);
        req.setAdminNote(adminNote);
        return OwnerVehicleRequestMapper.INSTANCE.toResponse(
                ownerVehicleRequestRepository.save(req)
        );
    }

    @Transactional
    public OwnerVehicleRequestResponse needMoreInfo(Long id, String adminNote) {
        OwnerVehicleRequest req = requireById(id);
        if (req.getStatus() != OwnerVehicleRequestStatus.PENDING) {
            throw new AppException(ErrorCode.OWNER_VEHICLE_REQUEST_STATUS_INVALID);
        }
        req.setStatus(OwnerVehicleRequestStatus.NEED_MORE_INFO);
        req.setAdminNote(adminNote);
        return OwnerVehicleRequestMapper.INSTANCE.toResponse(
                ownerVehicleRequestRepository.save(req)
        );
    }
}
