package com.example.ungdunggoixe.mapper;

import com.example.ungdunggoixe.common.LicenseVerificationStatus;
import com.example.ungdunggoixe.dto.request.CreateUserRequest;
import com.example.ungdunggoixe.dto.response.CreateUserResponse;
import com.example.ungdunggoixe.dto.response.UserResponse;
import com.example.ungdunggoixe.entity.User;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper
public interface UserMapper {
    UserMapper INSTANCE = Mappers.getMapper(UserMapper.class);

    @Mapping(target = "email", source = "email")
    @Mapping(target = "password", ignore = true)
    User ToUser(CreateUserRequest createUserRequest);

    CreateUserResponse ToCreateUserResponse(User user);

    @Mapping(target = "roles", ignore = true)
    UserResponse ToUserResponse(User user);

    @AfterMapping
    default void defaultLicenseStatusOnCreate(CreateUserRequest req, @MappingTarget User user) {
        if (user.getLicenseVerificationStatus() == null) {
            user.setLicenseVerificationStatus(LicenseVerificationStatus.NOT_SUBMITTED);
        }
    }

    @AfterMapping
    default void fillRoles(User user, @MappingTarget UserResponse response) {
        if (user.getUserRoles() == null || user.getUserRoles().isEmpty()) {
            response.setRoles(List.of());
            return;
        }
        List<String> names = user.getUserRoles().stream()
                .map(ur -> ur.getRole() != null ? ur.getRole().getName() : null)
                .filter(n -> n != null && !n.isBlank())
                .toList();
        response.setRoles(names);
    }
}
