package com.example.ungdunggoixe.repository;

import com.example.ungdunggoixe.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
    Optional<Permission> findByNameIgnoreCase(String name);
}
