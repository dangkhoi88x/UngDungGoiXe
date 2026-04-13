package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.common.LicenseVerificationStatus;
import com.example.ungdunggoixe.common.RoleName;
import com.example.ungdunggoixe.dto.request.CreateAdminBootstrapRequest;
import com.example.ungdunggoixe.dto.request.CreateUserRequest;

import com.example.ungdunggoixe.dto.request.UpdateMyProfileRequest;
import com.example.ungdunggoixe.dto.request.UpdateUserRequest;
import com.example.ungdunggoixe.dto.response.CreateUserResponse;
import com.example.ungdunggoixe.dto.response.UserResponse;
import com.example.ungdunggoixe.entity.Role;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.dto.response.PagedUserResponse;
import com.example.ungdunggoixe.mapper.UserMapper;
import com.example.ungdunggoixe.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {
    private static final Set<String> USER_SORT_FIELDS = Set.of("id", "email", "firstName", "lastName");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleService roleService;
    private final LocalUserDocumentStorage localUserDocumentStorage;

    public CreateUserResponse createUser(CreateUserRequest Request){
            String email=Request.getEmail();
            if(userRepository.existsByEmail(email)){
                throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }
        User user= UserMapper.INSTANCE.ToUser(Request);
        user.setPassword(passwordEncoder.encode(Request.getPassword()));
        Role role = roleService.createRole(RoleName.USER);
        user.addRole(role);
        userRepository.save(user);
        return UserMapper.INSTANCE.ToCreateUserResponse(user);
}

    @Transactional
    public CreateUserResponse createPrivilegedUser(CreateAdminBootstrapRequest req) {
        RoleName role = parseBootstrapRole(req.getRole());
        String email = req.getEmail();
        if (email == null || email.isBlank()
                || req.getPassword() == null || req.getPassword().isBlank()
                || req.getFirstName() == null || req.getFirstName().isBlank()
                || req.getLastName() == null || req.getLastName().isBlank()) {
            throw new AppException(ErrorCode.BOOTSTRAP_ADMIN_BODY_INVALID);
        }
        if (userRepository.existsByEmail(email.trim())) {
            throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }
        CreateUserRequest mapped = new CreateUserRequest();
        mapped.setEmail(email.trim());
        mapped.setPassword(req.getPassword());
        mapped.setFirstName(req.getFirstName());
        mapped.setLastName(req.getLastName());
        User user = UserMapper.INSTANCE.ToUser(mapped);
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.addRole(roleService.createRole(role));
        userRepository.save(user);
        return UserMapper.INSTANCE.ToCreateUserResponse(user);
    }

    private static RoleName parseBootstrapRole(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new AppException(ErrorCode.BOOTSTRAP_ADMIN_ROLE_INVALID);
        }
        String u = raw.trim().toUpperCase().replace('-', '_');
        if ("SUPER_ADMIN".equals(u)) {
            return RoleName.SUPER_ADMIN;
        }
        if ("ADMIN".equals(u)) {
            return RoleName.ADMIN;
        }
        throw new AppException(ErrorCode.BOOTSTRAP_ADMIN_ROLE_INVALID);
    }

    private static boolean currentAuthenticationHasAuthority(String authority) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return false;
        }
        for (GrantedAuthority ga : auth.getAuthorities()) {
            if (authority.equals(ga.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    public UserResponse getUserbyID(Long id){
        return userRepository.findById(id)
                .map(UserMapper.INSTANCE::ToUserResponse)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }
    public String deleteUserbyID(Long id){
        if(!userRepository.existsById(id)){
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }
        userRepository.deleteById(id);
        return "User has been deleted";
    }
//    /**

    public List<UserResponse> getAllUser(){
        List<User> users=userRepository.findAll();
        return users.stream()
                .map(UserMapper.INSTANCE::ToUserResponse)
                .toList();
    }

    public PagedUserResponse getUsersPaged(int page, int size, String sortBy, String sortDir) {
        String field = USER_SORT_FIELDS.contains(sortBy) ? sortBy : "id";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, field));
        Page<User> result = userRepository.findAll(pageable);
        Page<UserResponse> mapped = result.map(UserMapper.INSTANCE::ToUserResponse);
        return PagedUserResponse.builder()
                .content(mapped.getContent())
                .totalElements(mapped.getTotalElements())
                .totalPages(mapped.getTotalPages())
                .page(mapped.getNumber())
                .size(mapped.getSize())
                .build();
    }

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
                localUserDocumentStorage.deleteStoredFileIfPresent(user.getLicenseCardFrontImageUrl());
                localUserDocumentStorage.deleteStoredFileIfPresent(user.getLicenseCardBackImageUrl());
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
     * Người dùng gửi CMND/CCCD, số GPLX và ảnh hai mặt — trạng thái {@link LicenseVerificationStatus#PENDING}.
     */
    @Transactional
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

        String frontUrl = localUserDocumentStorage.storeUserImage(userId, frontImage, "gplx-front");
        String backUrl = localUserDocumentStorage.storeUserImage(userId, backImage, "gplx-back");

        user.setIdentityNumber(identityNumber.trim());
        user.setLicenseNumber(licenseNumber.trim());
        user.setLicenseCardFrontImageUrl(frontUrl);
        user.setLicenseCardBackImageUrl(backUrl);
        user.setLicenseVerificationStatus(LicenseVerificationStatus.PENDING);
        user.setVerifiedAt(null);

        userRepository.saveAndFlush(user);
        return UserMapper.INSTANCE.ToUserResponse(user);
    }

    public UserResponse getMyInfo(){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if(authentication == null)
            throw new RuntimeException("Authentication is null");
        Long userID = Long.parseLong(authentication.getName());
        User user = userRepository.findById(userID).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return UserMapper.INSTANCE.ToUserResponse(user);
    }

    @Transactional
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
}
