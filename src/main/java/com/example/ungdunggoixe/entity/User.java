package com.example.ungdunggoixe.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

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
        return "";
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
}
