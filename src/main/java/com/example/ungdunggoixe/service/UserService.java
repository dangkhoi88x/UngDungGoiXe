package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.LicenseVerificationStatus;
import com.example.ungdunggoixe.dto.request.CreateUserRequest;
import com.example.ungdunggoixe.dto.request.UpdateMyProfileRequest;
import com.example.ungdunggoixe.dto.request.UpdateUserRequest;
import com.example.ungdunggoixe.dto.response.CreateUserResponse;
import com.example.ungdunggoixe.dto.response.PageResponse;
import com.example.ungdunggoixe.dto.response.UserResponse;
import com.example.ungdunggoixe.entity.User;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface UserService {
    CreateUserResponse createUser(CreateUserRequest request);
    UserResponse getUserbyID(Long id);
    String deleteUserbyID(Long id);
    List<UserResponse> getAllUser();
    PageResponse<UserResponse> getUsersPaged( int page, int size, String sortBy, String sortDir, LicenseVerificationStatus licenseVerificationStatus, String keyword );
    UserResponse updateUser(Long id, UpdateUserRequest request);
    UserResponse submitMyDocuments( String identityNumber, String licenseNumber, MultipartFile frontImage, MultipartFile backImage );
    UserResponse getMyInfo();
    UserResponse updateMyProfile(UpdateMyProfileRequest request);
    User ensureUserForGoogleOAuth(String email, String givenName, String familyName);
}
