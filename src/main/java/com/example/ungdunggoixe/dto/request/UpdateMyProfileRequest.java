package com.example.ungdunggoixe.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Cập nhật hồ sơ của chính user đăng nhập. Họ → {@code firstName}, tên → {@code lastName}.
 * {@code null} = không đổi; họ/tên nếu gửi thì sau trim không được rỗng; {@code phone} rỗng = xóa SĐT.
 */
@Getter
@Setter
@NoArgsConstructor
public class UpdateMyProfileRequest {
    private String firstName;
    private String lastName;
    private String phone;
}
