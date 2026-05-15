package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.cache.UserCacheExpressions;
import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.common.LicenseVerificationStatus;
import com.example.ungdunggoixe.common.RoleName;
import com.example.ungdunggoixe.configuration.RedisConfiguration;

import com.example.ungdunggoixe.dto.request.CreateUserRequest;

import com.example.ungdunggoixe.dto.request.UpdateMyProfileRequest;
import com.example.ungdunggoixe.dto.request.UpdateUserRequest;
import com.example.ungdunggoixe.dto.response.CreateUserResponse;
import com.example.ungdunggoixe.dto.response.PageResponse;
import com.example.ungdunggoixe.dto.response.UserResponse;
import com.example.ungdunggoixe.entity.Role;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.mapper.UserMapper;
import com.example.ungdunggoixe.repository.UserRepository;
import com.example.ungdunggoixe.repository.specification.UserSpecs;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheConfig;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@CacheConfig(cacheNames = RedisConfiguration.USER_INFO_CACHE)
public class UserService {
    private static final Set<String> USER_SORT_FIELDS = Set.of(
            "id", "email", "firstName", "lastName", "licenseVerificationStatus", "verifiedAt", "updatedAt", "createdAt"
    );
    private static final Set<String> USER_DOCUMENT_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp"
    );

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleService roleService;
    private final LocalUserDocumentStorage localUserDocumentStorage;
    private final MediaService mediaService;
    private final MailService mailService;
    private final I18nService i18nService;

    private static String mapUserSortProperty(String sortBy) {
        if (sortBy == null || sortBy.isBlank() || !USER_SORT_FIELDS.contains(sortBy)) {
            return "id";
        }
        return sortBy;
    }

    private static Specification<User> buildUserSpec(
            LicenseVerificationStatus licenseVerificationStatus,
            String keyword
    ) {
        return UserSpecs.alwaysTrue()
                .and(UserSpecs.licenseVerificationStatusEquals(licenseVerificationStatus))
                .and(UserSpecs.keywordContains(keyword));
    }


    public CreateUserResponse createUser(CreateUserRequest request){
            String email = request.getEmail();
            if(userRepository.existsByEmail(email)){
                throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }
        User user= UserMapper.INSTANCE.ToUser(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        Role role = roleService.createRole(RoleName.USER);
        user.addRole(role);
        userRepository.save(user);
        String firstName = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String name = firstName.isEmpty() ? "bạn" : firstName;
        mailService.sendEmailWithTemplate(
                user.getEmail(),
                i18nService.getMessage("email.welcome.subject"),
                "welcome-gmail",
                Map.of(
                        "name", name,
                        "accountEmail", user.getEmail(),
                        "loginUrl", "http://localhost:5173/auth"
                )
        );
        return UserMapper.INSTANCE.ToCreateUserResponse(user);
}

    @Cacheable(key = "#id.toString()")
    public UserResponse getUserbyID(Long id){
        return userRepository.findById(id)
                .map(UserMapper.INSTANCE::ToUserResponse)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    @CacheEvict(key = "#id.toString()")
    public String deleteUserbyID(Long id){
        if(!userRepository.existsById(id)){
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }
        userRepository.deleteById(id);
        return i18nService.getMessage("response.user.delete.success");
    }
//    /**

    public List<UserResponse> getAllUser(){
        List<User> users=userRepository.findAll();
        return users.stream()
                .map(UserMapper.INSTANCE::ToUserResponse)
                .toList();
    }

    public PageResponse<UserResponse> getUsersPaged(
            int page,
            int size,
            String sortBy,
            String sortDir,
            LicenseVerificationStatus licenseVerificationStatus,
            String keyword
    ) {
        String field = mapUserSortProperty(sortBy);
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, field));
        Specification<User> spec = buildUserSpec(licenseVerificationStatus, keyword);
        Page<User> result = userRepository.findAll(spec, pageable);
        Page<UserResponse> mapped = result.map(UserMapper.INSTANCE::ToUserResponse);
        return PageResponse.<UserResponse>builder()
                .content(mapped.getContent())
                .totalElements(mapped.getTotalElements())
                .totalPages(mapped.getTotalPages())
                .page(mapped.getNumber())
                .size(mapped.getSize())
                .build();
    }

    @CacheEvict(key = "#id.toString()")
    public UserResponse updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String email = request.getEmail().trim();
            if (!email.equals(user.getEmail()) && userRepository.countByEmailAndIdNot(email, id) > 0) {
                throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }
            user.setEmail(email);
        }
        if (request.getFirstName() != null && !request.getFirstName().isBlank()) {
            user.setFirstName(request.getFirstName().trim());
        }
        if (request.getLastName() != null && !request.getLastName().isBlank()) {
            user.setLastName(request.getLastName().trim());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getIdentityNumber() != null) {
            user.setIdentityNumber(request.getIdentityNumber().isBlank() ? null : request.getIdentityNumber().trim());
        }
        if (request.getLicenseNumber() != null) {
            user.setLicenseNumber(request.getLicenseNumber().isBlank() ? null : request.getLicenseNumber().trim());
        }
        if (request.getLicenseCardFrontImageUrl() != null) {
            user.setLicenseCardFrontImageUrl(
                    request.getLicenseCardFrontImageUrl().isBlank() ? null : request.getLicenseCardFrontImageUrl().trim());
        }
        if (request.getLicenseCardBackImageUrl() != null) {
            user.setLicenseCardBackImageUrl(
                    request.getLicenseCardBackImageUrl().isBlank() ? null : request.getLicenseCardBackImageUrl().trim());
        }
        if (request.getLicenseVerificationStatus() != null) {
            LicenseVerificationStatus st = request.getLicenseVerificationStatus();
            if (st == LicenseVerificationStatus.REJECTED) {
                deleteUserDocumentIfPresent(user.getLicenseCardFrontImageUrl());
                deleteUserDocumentIfPresent(user.getLicenseCardBackImageUrl());
                user.setIdentityNumber(null);
                user.setLicenseNumber(null);
                user.setLicenseCardFrontImageUrl(null);
                user.setLicenseCardBackImageUrl(null);
            }
            user.setLicenseVerificationStatus(st);
            if (st == LicenseVerificationStatus.APPROVED) {
                user.setVerifiedAt(LocalDateTime.now());
            } else {
                user.setVerifiedAt(null);
            }
        }

        userRepository.save(user);
        return UserMapper.INSTANCE.ToUserResponse(user);
    }

    /**
     * Người dùng gửi CMND/CCCD, số GPLX và ảnh hai mặt lên S3 — trạng thái {@link LicenseVerificationStatus#PENDING}.
     */
    @Transactional
    @CacheEvict(key = UserCacheExpressions.CURRENT_PRINCIPAL_NAME)
    public UserResponse submitMyDocuments(
            String identityNumber,
            String licenseNumber,
            MultipartFile frontImage,
            MultipartFile backImage
    ) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        Long userId = Long.parseLong(authentication.getName());
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (user.getLicenseVerificationStatus() == LicenseVerificationStatus.APPROVED) {
            throw new AppException(ErrorCode.LICENSE_ALREADY_VERIFIED);
        }

        if (identityNumber == null || identityNumber.isBlank()
                || licenseNumber == null || licenseNumber.isBlank()) {
            throw new AppException(ErrorCode.DOCUMENT_SUBMISSION_INVALID);
        }
        validateUserDocumentImage(frontImage);
        validateUserDocumentImage(backImage);

        String folder = "users/" + userId + "/documents";
        String frontUrl = null;
        String backUrl = null;
        try {
            frontUrl = mediaService.uploadToS3AndGetUrl(frontImage, folder);
            backUrl = mediaService.uploadToS3AndGetUrl(backImage, folder);
        } catch (Exception e) {
            if (frontUrl != null && mediaService.isOurS3Url(frontUrl)) {
                mediaService.tryDeleteS3ByUrl(frontUrl);
            }
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }

        deleteUserDocumentIfPresent(user.getLicenseCardFrontImageUrl());
        deleteUserDocumentIfPresent(user.getLicenseCardBackImageUrl());
        user.setIdentityNumber(identityNumber.trim());
        user.setLicenseNumber(licenseNumber.trim());
        user.setLicenseCardFrontImageUrl(frontUrl);
        user.setLicenseCardBackImageUrl(backUrl);
        user.setLicenseVerificationStatus(LicenseVerificationStatus.PENDING);
        user.setVerifiedAt(null);

        userRepository.saveAndFlush(user);
        return UserMapper.INSTANCE.ToUserResponse(user);
    }

    private void validateUserDocumentImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.DOCUMENT_SUBMISSION_INVALID);
        }
        String contentType = file.getContentType();
        if (contentType == null || !USER_DOCUMENT_IMAGE_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new AppException(ErrorCode.DOCUMENT_SUBMISSION_INVALID);
        }
    }

    private void deleteUserDocumentIfPresent(String url) {
        if (url == null || url.isBlank()) {
            return;
        }
        String t = url.trim();
        if (mediaService.isOurS3Url(t)) {
            mediaService.tryDeleteS3ByUrl(t);
            return;
        }
        localUserDocumentStorage.deleteStoredFileIfPresent(t);
    }

    @Cacheable(key = UserCacheExpressions.CURRENT_PRINCIPAL_NAME)
    public UserResponse getMyInfo(){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if(authentication == null)
            throw new AppException(ErrorCode.AUTHENTICATION_MISSING);
        Long userID = Long.parseLong(authentication.getName());
        User user = userRepository.findById(userID).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return UserMapper.INSTANCE.ToUserResponse(user);
    }

    @Transactional
    @CacheEvict(key = UserCacheExpressions.CURRENT_PRINCIPAL_NAME)
    public UserResponse updateMyProfile(UpdateMyProfileRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        Long userId = Long.parseLong(authentication.getName());
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (request.getFirstName() != null) {
            String f = request.getFirstName().trim();
            if (f.isEmpty()) {
                throw new AppException(ErrorCode.PROFILE_UPDATE_INVALID);
            }
            user.setFirstName(f);
        }
        if (request.getLastName() != null) {
            String l = request.getLastName().trim();
            if (l.isEmpty()) {
                throw new AppException(ErrorCode.PROFILE_UPDATE_INVALID);
            }
            user.setLastName(l);
        }
        if (request.getPhone() != null) {
            String p = request.getPhone().trim();
            user.setPhone(p.isEmpty() ? null : p);
        }

        userRepository.save(user);
        return UserMapper.INSTANCE.ToUserResponse(user);
    }

    /**
     * Tim user theo email hoac tao moi (ROLE_USER) khi dang nhap Google; khong gui email chao mung.
     */
    @Transactional
    public User ensureUserForGoogleOAuth(String email, String givenName, String familyName) {
        String normalized = email.trim().toLowerCase();
        Optional<User> existing = userRepository.findByEmail(normalized);
        if (existing.isPresent()) {
            return existing.get();
        }
        String fn = (givenName != null && !givenName.isBlank()) ? givenName.trim() : "Google";
        String ln = (familyName != null && !familyName.isBlank()) ? familyName.trim() : "User";
        User user = new User();
        user.setEmail(normalized);
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setFirstName(fn);
        user.setLastName(ln);
        user.setLicenseVerificationStatus(LicenseVerificationStatus.NOT_SUBMITTED);
        user.addRole(roleService.createRole(RoleName.USER));
        userRepository.save(user);
        return userRepository.findByIdWithUserRoles(user.getId())
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_ERROR));
    }
}
