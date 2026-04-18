package com.example.ungdunggoixe.controller;


import com.example.ungdunggoixe.dto.request.CreateUserRequest;

import com.example.ungdunggoixe.dto.request.UpdateMyProfileRequest;
import com.example.ungdunggoixe.dto.request.UpdateUserRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.CreateUserResponse;
import com.example.ungdunggoixe.dto.response.PagedUserResponse;
import com.example.ungdunggoixe.dto.response.UserResponse;
import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    @Value("${app.bootstrap-admin-secret:}")
    private String bootstrapAdminSecret;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    public ApiResponse<CreateUserResponse> createUser(@RequestBody CreateUserRequest createUserRequest) {
        CreateUserResponse result = userService.createUser(createUserRequest);
        return ApiResponse.<CreateUserResponse>builder()
                .status("success")
                .message("Create user successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }


    

    /** Không dùng <code>/page</code> — Spring có thể khớp nhầm với <code>/{id}</code> (id = "page"). */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/my-info")
    public ApiResponse<UserResponse> getMyInfo() {
        UserResponse result = userService.getMyInfo();
        return ApiResponse.<UserResponse>builder()
                .status("success")
                .message("Get my info successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    /** Người dùng đã đăng nhập: cập nhật họ ({@code firstName}), tên ({@code lastName}) và/hoặc số điện thoại. Dùng PUT (tránh lỗi PATCH không khớp handler trên một số cấu hình). */
    @PreAuthorize("isAuthenticated()")
    @PutMapping("/my-profile")
    public ApiResponse<UserResponse> updateMyProfile(@RequestBody UpdateMyProfileRequest request) {
        UserResponse result = userService.updateMyProfile(request);
        return ApiResponse.<UserResponse>builder()
                .status("success")
                .message("Update my profile successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    /** Gửi giấy tờ GPLX để admin duyệt (multipart: identityNumber, licenseNumber, frontImage, backImage). */
    @PreAuthorize("isAuthenticated()")
    @PostMapping(value = "/my-documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        public ApiResponse<UserResponse> submitMyDocuments(
            @RequestParam("identityNumber") String identityNumber,
            @RequestParam("licenseNumber") String licenseNumber,
            @RequestParam("frontImage") MultipartFile frontImage,
            @RequestParam("backImage") MultipartFile backImage
    ) {
        UserResponse result = userService.submitMyDocuments(identityNumber, licenseNumber, frontImage, backImage);
        return ApiResponse.<UserResponse>builder()
                .status("success")
                .message("Submit documents successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @GetMapping("/paged")
    public ApiResponse<PagedUserResponse> getUsersPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        PagedUserResponse result = userService.getUsersPaged(page, size, sortBy, sortDir);
        return ApiResponse.<PagedUserResponse>builder()
                .status("success")
                .message("Get users page successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @GetMapping("/{id}")
    public ApiResponse<UserResponse> getUserById(@PathVariable Long id) {
        UserResponse result = userService.getUserbyID(id);
        return ApiResponse.<UserResponse>builder()
                .status("success")
                .message("Get user by id successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @GetMapping
    public ApiResponse<List<UserResponse>> getAllUsers() {
        List<UserResponse> result = userService.getAllUser();
        return ApiResponse.<List<UserResponse>>builder()
                .status("success")
                .message("Get all users successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @PutMapping("/{id}")
    public ApiResponse<UserResponse> updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest request) {
        UserResponse result = userService.updateUser(id, request);
        return ApiResponse.<UserResponse>builder()
                .status("success")
                .message("Update user successful")
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @DeleteMapping("/{id}")
    public String deleteUserById(@PathVariable Long id) {
        return userService.deleteUserbyID(id);
    }
}
