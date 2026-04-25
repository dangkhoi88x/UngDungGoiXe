package com.example.ungdunggoixe.controller;


import com.example.ungdunggoixe.dto.request.CreateUserRequest;

import com.example.ungdunggoixe.dto.request.UpdateMyProfileRequest;
import com.example.ungdunggoixe.dto.request.UpdateUserRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.CreateUserResponse;
import com.example.ungdunggoixe.dto.response.PagedUserResponse;
import com.example.ungdunggoixe.dto.response.UserResponse;
import com.example.ungdunggoixe.service.I18nService;
import com.example.ungdunggoixe.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
    private final I18nService i18nService;

    @Value("${app.bootstrap-admin-secret:}")
    private String bootstrapAdminSecret;

    public UserController(UserService userService, I18nService i18nService) {
        this.userService = userService;
        this.i18nService = i18nService;
    }

    @PostMapping
    @Operation(summary = "Tao user", description = "Dang ky tai khoan nguoi dung moi.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Tao user thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Email da ton tai")
    })
    public ApiResponse<CreateUserResponse> createUser(@RequestBody CreateUserRequest createUserRequest) {
        CreateUserResponse result = userService.createUser(createUserRequest);
        return ApiResponse.<CreateUserResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.user.create.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }


    

    /** Không dùng <code>/page</code> — Spring có thể khớp nhầm với <code>/{id}</code> (id = "page"). */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/my-info")
    @Operation(summary = "Lay thong tin cua toi", description = "Lay profile cua user dang dang nhap.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Lay thong tin thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Chua dang nhap")
    })
    public ApiResponse<UserResponse> getMyInfo() {
        UserResponse result = userService.getMyInfo();
        return ApiResponse.<UserResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.user.me.success"))
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
                .message(i18nService.getMessage("response.user.profile.update.success"))
                .data(result)
                .timestamp(Instant.now())
                .build();
    }

    /** Gửi giấy tờ GPLX để admin duyệt (multipart: identityNumber, licenseNumber, frontImage, backImage). */
    @PreAuthorize("isAuthenticated()")
    @PostMapping(value = "/my-documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Gui giay to xac minh", description = "Nguoi dung gui CMND/CCCD va GPLX de cho duyet.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Gui giay to thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Du lieu hoac file khong hop le"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Chua dang nhap")
    })
        public ApiResponse<UserResponse> submitMyDocuments(
            @RequestParam("identityNumber") String identityNumber,
            @RequestParam("licenseNumber") String licenseNumber,
            @RequestParam("frontImage") MultipartFile frontImage,
            @RequestParam("backImage") MultipartFile backImage
    ) {
        UserResponse result = userService.submitMyDocuments(identityNumber, licenseNumber, frontImage, backImage);
        return ApiResponse.<UserResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.user.documents.submit.success"))
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
                .message(i18nService.getMessage("response.user.page.success"))
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
                .message(i18nService.getMessage("response.user.get_by_id.success"))
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
                .message(i18nService.getMessage("response.user.get_all.success"))
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
                .message(i18nService.getMessage("response.user.update.success"))
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
