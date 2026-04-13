package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.request.CreateAdminBootstrapRequest;
import com.example.ungdunggoixe.dto.request.CreateUserRequest;

import com.example.ungdunggoixe.dto.request.UpdateMyProfileRequest;
import com.example.ungdunggoixe.dto.request.UpdateUserRequest;
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
    public CreateUserResponse createUser(@RequestBody CreateUserRequest createUserRequest) {
        return userService.createUser(createUserRequest);
    }

    /**
     * Tạo tài khoản với role ADMIN hoặc SUPER_ADMIN (chỉ khi đã cấu hình {@code app.bootstrap-admin-secret}).
     * Postman: header {@code X-Bootstrap-Secret} trùng secret; body JSON xem tài liệu API.
     */
    @PostMapping("/bootstrap-admin")
    public CreateUserResponse bootstrapAdmin(
            @RequestHeader(value = "X-Bootstrap-Secret", required = false) String secret,
            @RequestBody CreateAdminBootstrapRequest body) {
        if (bootstrapAdminSecret == null || bootstrapAdminSecret.isBlank()) {
            throw new AppException(ErrorCode.BOOTSTRAP_ADMIN_DISABLED);
        }
        if (secret == null || !bootstrapAdminSecret.equals(secret)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        return userService.createPrivilegedUser(body);
    }

    

    /** Không dùng <code>/page</code> — Spring có thể khớp nhầm với <code>/{id}</code> (id = "page"). */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/my-info")
    public UserResponse getMyInfo() {
        return userService.getMyInfo();
    }

    /** Người dùng đã đăng nhập: cập nhật họ ({@code firstName}), tên ({@code lastName}) và/hoặc số điện thoại. Dùng PUT (tránh lỗi PATCH không khớp handler trên một số cấu hình). */
    @PreAuthorize("isAuthenticated()")
    @PutMapping("/my-profile")
    public UserResponse updateMyProfile(@RequestBody UpdateMyProfileRequest request) {
        return userService.updateMyProfile(request);
    }

    /** Gửi giấy tờ GPLX để admin duyệt (multipart: identityNumber, licenseNumber, frontImage, backImage). */
    @PreAuthorize("isAuthenticated()")
    @PostMapping(value = "/my-documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserResponse submitMyDocuments(
            @RequestParam("identityNumber") String identityNumber,
            @RequestParam("licenseNumber") String licenseNumber,
            @RequestParam("frontImage") MultipartFile frontImage,
            @RequestParam("backImage") MultipartFile backImage
    ) {
        return userService.submitMyDocuments(identityNumber, licenseNumber, frontImage, backImage);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    @GetMapping("/paged")
    public PagedUserResponse getUsersPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return userService.getUsersPaged(page, size, sortBy, sortDir);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    @GetMapping("/{id}")
    public UserResponse getUserById(@PathVariable Long id) {
        return userService.getUserbyID(id);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    @GetMapping
    public List<UserResponse> getAllUsers() {
        return userService.getAllUser();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    @PutMapping("/{id}")
    public UserResponse updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest request) {
        return userService.updateUser(id, request);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    @DeleteMapping("/{id}")
    public String deleteUserById(@PathVariable Long id) {
        return userService.deleteUserbyID(id);
    }
}
