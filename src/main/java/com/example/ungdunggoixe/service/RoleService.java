package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.RoleName;
import com.example.ungdunggoixe.entity.Role;
import com.example.ungdunggoixe.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RoleService {
    private final RoleRepository roleRepository;
    public Role createRole(RoleName roleName) {
            return roleRepository.findByNameIgnoreCase(roleName.name())
                    .orElseGet(() -> roleRepository.save(Role
                            .builder()
                            .name(roleName.name())
                            .build()));

    }
}
