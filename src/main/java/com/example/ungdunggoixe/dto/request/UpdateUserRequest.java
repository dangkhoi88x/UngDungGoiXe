package com.example.ungdunggoixe.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateUserRequest {
    private String email;
    private String firstName;
    private String lastName;
    /** Để trống hoặc null = không đổi mật khẩu */
    private String password;

    /** Admin: cập nhật giấy tờ / trạng thái xác minh GPLX */
    private String identityNumber;
    private String licenseNumber;
    private String licenseCardFrontImageUrl;
    private String licenseCardBackImageUrl;
    /** null = không đổi */
    private Boolean isLicenseVerified;
}
