package com.example.ungdunggoixe.entity;

import com.example.ungdunggoixe.common.LicenseVerificationStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User implements UserDetails {
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
                List<Role> listRoles = this.userRoles.stream()
                        .map(UserRole::getRole)
                        .toList();
                List<String> rolesName= listRoles.stream()
                        .map(Role::getName)
                        .toList();
                return rolesName.stream()
                        .map(roleName -> new SimpleGrantedAuthority("ROLE_" +roleName))
                        .toList();
    }

    @Override
    public String getUsername() {
        return email != null ? email : "";
    }

    @Override
    public boolean isAccountNonExpired() {
        return UserDetails.super.isAccountNonExpired();
    }

    @Override
    public boolean isAccountNonLocked() {
        return UserDetails.super.isAccountNonLocked();
    }
    @OneToMany(mappedBy = "user",cascade = CascadeType.ALL)
    @Builder.Default
    private List<UserRole> userRoles = new ArrayList<>();

    public void addRole(Role role) {
        UserRole userRole = UserRole.builder()
                .user(this)
                .role(role)
                .build();

        this.userRoles.add(userRole);
    }
    @Override
    public boolean isCredentialsNonExpired() {
        return UserDetails.super.isCredentialsNonExpired();
    }

    @Override
    public boolean isEnabled() {
        return UserDetails.super.isEnabled();
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @JsonIgnore
    private String password;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private String phone;
    @Column(name = "identity_number")
    private String identityNumber;
    @Column(name = "license_number")
    private String licenseNumber;
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "license_verification_status", nullable = false, length = 32)
    private LicenseVerificationStatus licenseVerificationStatus = LicenseVerificationStatus.NOT_SUBMITTED;
    @Column(name = "license_card_front_image_url")
    private String licenseCardFrontImageUrl;

    @Column(name = "license_card_back_image_url")
    private String licenseCardBackImageUrl;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

}
