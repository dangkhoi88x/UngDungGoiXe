package com.example.ungdunggoixe.dto.response;

import com.example.ungdunggoixe.common.LicenseVerificationStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
public class UserResponse {

    private Long id;
    private String email;
    private String firstName;
    private String lastName;

    private String phone;
    private String identityNumber;
    private String licenseNumber;
    private LicenseVerificationStatus licenseVerificationStatus;
    private String licenseCardFrontImageUrl;
    private String licenseCardBackImageUrl;
    private LocalDateTime updatedAt;
    private LocalDateTime verifiedAt;

    @Builder.Default
    private List<String> roles = new ArrayList<>();
}
