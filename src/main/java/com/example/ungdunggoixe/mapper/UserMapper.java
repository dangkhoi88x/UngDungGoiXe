package com.example.ungdunggoixe.mapper;

import com.example.ungdunggoixe.dto.request.CreateUserRequest;
import com.example.ungdunggoixe.dto.response.CreateUserResponse;
import com.example.ungdunggoixe.dto.response.UserResponse;
import com.example.ungdunggoixe.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

@Mapper
public interface UserMapper {
        UserMapper INSTANCE = Mappers.getMapper(UserMapper.class);
        @Mapping(target = "email",source = "email")
        @Mapping(target= "password", ignore = true)


        User ToUser(CreateUserRequest createUserRequest);

        CreateUserResponse ToCreateUserResponse(User user);
        UserResponse ToUserResponse(User user);
}
