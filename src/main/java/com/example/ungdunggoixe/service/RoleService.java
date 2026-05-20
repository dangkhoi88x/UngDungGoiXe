package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.RoleName;
import com.example.ungdunggoixe.entity.Role;
import com.example.ungdunggoixe.repository.RoleRepository;

public interface RoleService {
    Role createRole(RoleName roleName);
}
