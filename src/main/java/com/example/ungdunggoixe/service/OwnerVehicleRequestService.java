package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.common.OwnerVehicleRequestStatus;
import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.dto.request.CreateOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.request.UpdateOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.response.BookingResponse;
import com.example.ungdunggoixe.dto.response.OwnerVehicleRequestResponse;
import com.example.ungdunggoixe.entity.OwnerVehicleRequest;
import com.example.ungdunggoixe.entity.OwnerVehicleRequestHistoryItem;
import com.example.ungdunggoixe.entity.Station;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.entity.Vehicle;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.mapper.OwnerVehicleRequestMapper;
import com.example.ungdunggoixe.mapper.BookingMapper;
import com.example.ungdunggoixe.repository.BookingRepository;
import com.example.ungdunggoixe.repository.OwnerVehicleRequestRepository;
import com.example.ungdunggoixe.repository.StationRepository;
import com.example.ungdunggoixe.repository.UserRepository;
import com.example.ungdunggoixe.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class OwnerVehicleRequestService {
    private final OwnerVehicleRequestRepository ownerVehicleRequestRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final StationRepository stationRepository;
    private final VehicleRepository vehicleRepository;
    private final OwnerVehicleMediaService ownerVehicleMediaService;
    private final MailService mailService;
    @Value("${app.web-base-url:http://localhost:5173}")
    private String webBaseUrl;
    private static final int MAX_PHOTOS_PER_REQUEST = 20;

    private static String normalizePlate(String raw) {
        return raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
    }

    private static final class ActorSnapshot {
        private final Long id;
        private final String email;

        private ActorSnapshot(Long id, String email) {
            this.id = id;
            this.email = email;
        }
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

    private ActorSnapshot currentActorSnapshot() {
        try {
            Long uid = currentUserId();
            return userRepository.findById(uid)
                    .map(u -> new ActorSnapshot(u.getId(), u.getEmail()))
                    .orElse(new ActorSnapshot(uid, null));
        } catch (AppException ex) {
            return new ActorSnapshot(null, null);
        }
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
        if (photos.size() > MAX_PHOTOS_PER_REQUEST) {
            throw new AppException(ErrorCode.OWNER_VEHICLE_REQUEST_PHOTOS_TOO_MANY);
        }
        String reg = req.getRegistrationDocUrl() == null ? "" : req.getRegistrationDocUrl().trim();
        String ins = req.getInsuranceDocUrl() == null ? "" : req.getInsuranceDocUrl().trim();
        if (reg.isEmpty() || ins.isEmpty()) {
            throw new AppException(ErrorCode.OWNER_VEHICLE_REQUEST_DOCS_REQUIRED);
        }
    }

    private void cleanupRemovedFiles(
            String previousRegistration,
            String previousInsurance,
            List<String> previousPhotos,
            OwnerVehicleRequest req
    ) {
        String currentRegistration = req.getRegistrationDocUrl();
        String currentInsurance = req.getInsuranceDocUrl();
        List<String> currentPhotos = req.getPhotos() == null ? List.of() : req.getPhotos();

        if (previousRegistration != null
                && !previousRegistration.equals(currentRegistration)
                && ownerVehicleMediaService.isManagedOwnerVehicleUrl(previousRegistration)) {
            ownerVehicleMediaService.deleteStoredFileIfPresent(previousRegistration);
        }
        if (previousInsurance != null
                && !previousInsurance.equals(currentInsurance)
                && ownerVehicleMediaService.isManagedOwnerVehicleUrl(previousInsurance)) {
            ownerVehicleMediaService.deleteStoredFileIfPresent(previousInsurance);
        }

        Set<String> currentSet = new HashSet<>(currentPhotos);
        for (String oldPhoto : previousPhotos) {
            if (oldPhoto == null || currentSet.contains(oldPhoto)) continue;
            if (ownerVehicleMediaService.isManagedOwnerVehicleUrl(oldPhoto)) {
                ownerVehicleMediaService.deleteStoredFileIfPresent(oldPhoto);
            }
        }
    }

    private void cleanupAllFilesForRequest(OwnerVehicleRequest req) {
        if (req.getRegistrationDocUrl() != null
                && ownerVehicleMediaService.isManagedOwnerVehicleUrl(req.getRegistrationDocUrl())) {
            ownerVehicleMediaService.deleteStoredFileIfPresent(req.getRegistrationDocUrl());
        }
        if (req.getInsuranceDocUrl() != null
                && ownerVehicleMediaService.isManagedOwnerVehicleUrl(req.getInsuranceDocUrl())) {
            ownerVehicleMediaService.deleteStoredFileIfPresent(req.getInsuranceDocUrl());
        }
        List<String> photos = req.getPhotos() == null ? List.of() : req.getPhotos();
        for (String photo : photos) {
            if (ownerVehicleMediaService.isManagedOwnerVehicleUrl(photo)) {
                ownerVehicleMediaService.deleteStoredFileIfPresent(photo);
            }
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

    private void appendHistory(
            OwnerVehicleRequest req,
            String eventType,
            String actorRole,
            Long actorId,
            String actorEmail,
            OwnerVehicleRequestStatus status,
            String note
    ) {
        if (req.getHistory() == null) {
            req.setHistory(new ArrayList<>());
        }
        String normalizedNote = note == null ? null : note.trim();
        if (normalizedNote != null && normalizedNote.isEmpty()) {
            normalizedNote = null;
        }
        req.getHistory().add(OwnerVehicleRequestHistoryItem.builder()
                .eventType(eventType)
                .actorRole(actorRole)
                .actorId(actorId)
                .actorEmail(actorEmail)
                .status(status)
                .note(normalizedNote)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private static String ownerRequestStatusLabel(OwnerVehicleRequestStatus status) {
        return switch (status) {
            case APPROVED -> "Da duyet";
            case REJECTED -> "Tu choi";
            case NEED_MORE_INFO -> "Can bo sung";
            case PENDING -> "Cho duyet";
            case CANCELLED -> "Da huy";
        };
    }

    private static String ownerRequestStatusTag(OwnerVehicleRequestStatus status) {
        return switch (status) {
            case APPROVED -> "APPROVED";
            case REJECTED -> "REJECTED";
            case NEED_MORE_INFO -> "NEED_MORE_INFO";
            case PENDING -> "PENDING";
            case CANCELLED -> "CANCELLED";
        };
    }

    private static String ownerRequestStatusIcon(OwnerVehicleRequestStatus status) {
        return switch (status) {
            case APPROVED -> "[OK]";
            case REJECTED -> "[X]";
            case NEED_MORE_INFO -> "[!]";
            case PENDING -> "[...]";
            case CANCELLED -> "[-]";
        };
    }

    private static String ownerRequestStatusColor(OwnerVehicleRequestStatus status) {
        return switch (status) {
            case APPROVED -> "#1e7e34";
            case REJECTED -> "#b42318";
            case NEED_MORE_INFO -> "#b54708";
            case PENDING -> "#175cd3";
            case CANCELLED -> "#475467";
        };
    }

    private static String ownerRequestStatusBackground(OwnerVehicleRequestStatus status) {
        return switch (status) {
            case APPROVED -> "#ecfdf3";
            case REJECTED -> "#fef3f2";
            case NEED_MORE_INFO -> "#fff6ed";
            case PENDING -> "#eff8ff";
            case CANCELLED -> "#f2f4f7";
        };
    }

    private void sendOwnerRequestReviewEmail(OwnerVehicleRequest req, OwnerVehicleRequestStatus status, String adminNote) {
        if (req.getOwner() == null || req.getOwner().getEmail() == null || req.getOwner().getEmail().isBlank()) {
            return;
        }
        String firstName = req.getOwner().getFirstName() == null ? "" : req.getOwner().getFirstName().trim();
        String name = firstName.isEmpty() ? "ban" : firstName;
        String normalizedNote = adminNote == null ? "" : adminNote.trim();
        String note = normalizedNote.isEmpty() ? "Khong co ghi chu bo sung tu admin." : normalizedNote;
        String vehicleName = req.getName() == null || req.getName().isBlank() ? req.getLicensePlate() : req.getName().trim();
        String detailUrl = webBaseUrl.replaceAll("/+$", "") + "/owner/vehicle-requests/" + req.getId();
        String statusLabel = ownerRequestStatusLabel(status);
        String statusTag = ownerRequestStatusTag(status);

        mailService.sendEmailWithTemplate(
                req.getOwner().getEmail(),
                "[" + statusTag + "] Owner Request #" + req.getId() + " - " + statusLabel,
                "owner-request-review",
                Map.of(
                        "name", name,
                        "requestId", req.getId(),
                        "vehicleName", vehicleName,
                        "statusLabel", statusLabel,
                        "statusTag", statusTag,
                        "statusIcon", ownerRequestStatusIcon(status),
                        "statusColor", ownerRequestStatusColor(status),
                        "statusBackground", ownerRequestStatusBackground(status),
                        "adminNote", note,
                        "detailUrl", detailUrl
                )
        );
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
        appendHistory(
                entity,
                "SUBMITTED",
                "OWNER",
                owner.getId(),
                owner.getEmail(),
                OwnerVehicleRequestStatus.PENDING,
                "Owner gửi yêu cầu đăng xe cho thuê."
        );

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

    @Transactional(readOnly = true)
    public List<BookingResponse> getMyApprovedVehicleBookings(Long requestId) {
        Long ownerId = currentUserId();
        OwnerVehicleRequest req = requireById(requestId);
        if (!req.getOwner().getId().equals(ownerId)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        if (req.getApprovedVehicle() == null || req.getApprovedVehicle().getId() == null) {
            return List.of();
        }
        return bookingRepository.findByVehicleIdOrderByStartTimeDesc(req.getApprovedVehicle().getId())
                .stream()
                .map(BookingMapper.INSTANCE::toBookingResponse)
                .toList();
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
        String previousRegistration = req.getRegistrationDocUrl();
        String previousInsurance = req.getInsuranceDocUrl();
        List<String> previousPhotos = req.getPhotos() == null ? List.of() : new ArrayList<>(req.getPhotos());

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
        cleanupRemovedFiles(previousRegistration, previousInsurance, previousPhotos, req);
        appendHistory(
                req,
                "UPDATED_BY_OWNER",
                "OWNER",
                req.getOwner() != null ? req.getOwner().getId() : ownerId,
                req.getOwner() != null ? req.getOwner().getEmail() : null,
                req.getStatus(),
                "Owner cập nhật thông tin hồ sơ xe."
        );

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
        appendHistory(
                req,
                "RESUBMITTED",
                "OWNER",
                req.getOwner() != null ? req.getOwner().getId() : ownerId,
                req.getOwner() != null ? req.getOwner().getEmail() : null,
                OwnerVehicleRequestStatus.PENDING,
                "Owner gửi lại hồ sơ sau khi chỉnh sửa."
        );
        return OwnerVehicleRequestMapper.INSTANCE.toResponse(
                ownerVehicleRequestRepository.save(req)
        );
    }

    @Transactional
    public OwnerVehicleRequestResponse cancel(Long id) {
        Long ownerId = currentUserId();
        OwnerVehicleRequest req = requireById(id);
        if (!req.getOwner().getId().equals(ownerId)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        if (req.getStatus() == OwnerVehicleRequestStatus.APPROVED
                || req.getStatus() == OwnerVehicleRequestStatus.CANCELLED) {
            throw new AppException(ErrorCode.OWNER_VEHICLE_REQUEST_STATUS_INVALID);
        }
        req.setStatus(OwnerVehicleRequestStatus.CANCELLED);
        req.setAdminNote("Owner đã hủy yêu cầu.");
        appendHistory(
                req,
                "CANCELLED_BY_OWNER",
                "OWNER",
                req.getOwner() != null ? req.getOwner().getId() : ownerId,
                req.getOwner() != null ? req.getOwner().getEmail() : null,
                OwnerVehicleRequestStatus.CANCELLED,
                "Owner hủy yêu cầu và hệ thống dọn file upload cũ."
        );
        cleanupAllFilesForRequest(req);
        req.setRegistrationDocUrl(null);
        req.setInsuranceDocUrl(null);
        req.setPhotos(new ArrayList<>());
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
        ActorSnapshot actor = currentActorSnapshot();
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
        appendHistory(
                req,
                "APPROVED_BY_ADMIN",
                "ADMIN",
                actor.id,
                actor.email,
                OwnerVehicleRequestStatus.APPROVED,
                adminNote
        );
        OwnerVehicleRequest saved = ownerVehicleRequestRepository.save(req);
        sendOwnerRequestReviewEmail(saved, OwnerVehicleRequestStatus.APPROVED, adminNote);
        return OwnerVehicleRequestMapper.INSTANCE.toResponse(saved);
    }

    @Transactional
    public OwnerVehicleRequestResponse reject(Long id, String adminNote) {
        ActorSnapshot actor = currentActorSnapshot();
        OwnerVehicleRequest req = requireById(id);
        if (req.getStatus() == OwnerVehicleRequestStatus.APPROVED
                || req.getStatus() == OwnerVehicleRequestStatus.CANCELLED) {
            throw new AppException(ErrorCode.OWNER_VEHICLE_REQUEST_STATUS_INVALID);
        }
        req.setStatus(OwnerVehicleRequestStatus.REJECTED);
        req.setAdminNote(adminNote);
        appendHistory(
                req,
                "REJECTED_BY_ADMIN",
                "ADMIN",
                actor.id,
                actor.email,
                OwnerVehicleRequestStatus.REJECTED,
                adminNote
        );
        OwnerVehicleRequest saved = ownerVehicleRequestRepository.save(req);
        sendOwnerRequestReviewEmail(saved, OwnerVehicleRequestStatus.REJECTED, adminNote);
        return OwnerVehicleRequestMapper.INSTANCE.toResponse(saved);
    }

    @Transactional
    public OwnerVehicleRequestResponse needMoreInfo(Long id, String adminNote) {
        ActorSnapshot actor = currentActorSnapshot();
        OwnerVehicleRequest req = requireById(id);
        if (req.getStatus() != OwnerVehicleRequestStatus.PENDING) {
            throw new AppException(ErrorCode.OWNER_VEHICLE_REQUEST_STATUS_INVALID);
        }
        req.setStatus(OwnerVehicleRequestStatus.NEED_MORE_INFO);
        req.setAdminNote(adminNote);
        appendHistory(
                req,
                "NEED_MORE_INFO_BY_ADMIN",
                "ADMIN",
                actor.id,
                actor.email,
                OwnerVehicleRequestStatus.NEED_MORE_INFO,
                adminNote
        );
        OwnerVehicleRequest saved = ownerVehicleRequestRepository.save(req);
        sendOwnerRequestReviewEmail(saved, OwnerVehicleRequestStatus.NEED_MORE_INFO, adminNote);
        return OwnerVehicleRequestMapper.INSTANCE.toResponse(saved);
    }
}
