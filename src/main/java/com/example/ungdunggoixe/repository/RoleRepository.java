package com.example.ungdunggoixe.repository;

import com.example.ungdunggoixe.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository  extends JpaRepository<Role, Long> {
    Optional<Role> findByNameIgnoreCase(String name);
}
