package com.example.ungdunggoixe.repository;

import com.example.ungdunggoixe.entity.Permission;
import com.example.ungdunggoixe.entity.Role;
import com.example.ungdunggoixe.entity.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {
    boolean existsByRoleAndPermission(Role role, Permission permission);
}
