package com.example.ungdunggoixe.entity;

import com.example.ungdunggoixe.common.LicenseVerificationStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class User extends AuditableEntity implements UserDetails {
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Set<String> authorities = new LinkedHashSet<>();
        this.userRoles.stream()
                .map(UserRole::getRole)
                .filter(role -> role != null && role.getName() != null)
                .forEach(role -> {
                    authorities.add("ROLE_" + role.getName());
                    if (role.getRolePermissions() == null) {
                        return;
                    }
                    role.getRolePermissions().stream()
                            .map(RolePermission::getPermission)
                            .filter(permission -> permission != null && permission.getName() != null)
                            .map(Permission::getName)
                            .forEach(authorities::add);
                });
        return authorities.stream()
                .map(SimpleGrantedAuthority::new)
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

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

}
