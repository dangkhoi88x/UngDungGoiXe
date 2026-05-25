package com.example.ungdunggoixe.service.implement;

import com.example.ungdunggoixe.service.*;

import com.example.ungdunggoixe.common.PermissionName;
import com.example.ungdunggoixe.common.RoleName;
import com.example.ungdunggoixe.entity.Permission;
import com.example.ungdunggoixe.entity.Role;
import com.example.ungdunggoixe.entity.RolePermission;
import com.example.ungdunggoixe.repository.PermissionRepository;
import com.example.ungdunggoixe.repository.RoleRepository;
import com.example.ungdunggoixe.repository.RolePermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleServiceImplement implements RoleService {
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;

    @Transactional
    public Role createRole(RoleName roleName) {
        Role role = roleRepository.findByNameIgnoreCase(roleName.name())
                .orElseGet(() -> roleRepository.save(Role
                        .builder()
                        .name(roleName.name())
                        .build()));
        ensureDefaultPermissions(roleName, role);
        return role;
    }

    private void ensureDefaultPermissions(RoleName roleName, Role role) {
        defaultPermissions(roleName).forEach(permissionName -> assignPermission(role, permissionName));
    }

    private List<PermissionName> defaultPermissions(RoleName roleName) {
        return switch (roleName) {
            case USER -> List.of();
            case ADMIN -> List.of(
                    PermissionName.DASHBOARD_VIEW,
                    PermissionName.VEHICLE_MANAGE,
                    PermissionName.BOOKING_MANAGE,
                    PermissionName.PAYMENT_MANAGE,
                    PermissionName.STATION_MANAGE,
                    PermissionName.BLOG_MANAGE,
                    PermissionName.OWNER_REQUEST_MANAGE
            );
            case SUPER_ADMIN -> List.of(PermissionName.values());
        };
    }

    private void assignPermission(Role role, PermissionName permissionName) {
        Permission permission = permissionRepository.findByNameIgnoreCase(permissionName.name())
                .orElseGet(() -> permissionRepository.save(Permission.builder()
                        .name(permissionName.name())
                        .build()));
        if (rolePermissionRepository.existsByRoleAndPermission(role, permission)) {
            return;
        }
        rolePermissionRepository.save(RolePermission.builder()
                .role(role)
                .permission(permission)
                .build());
    }
}
