package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.dto.request.CreateUserRequest;
import com.example.ungdunggoixe.dto.request.UpdateUserRequest;
import com.example.ungdunggoixe.dto.response.CreateUserResponse;
import com.example.ungdunggoixe.dto.response.UserResponse;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.mapper.UserMapper;
import com.example.ungdunggoixe.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    public CreateUserResponse createUser(CreateUserRequest Request){
            String email=Request.getEmail();
            if(userRepository.existsByEmail(email)){
                throw new RuntimeException("Email already exists");
            }
        User user= UserMapper.INSTANCE.ToUser(Request);
        user.setPassword(passwordEncoder.encode(Request.getPassword()));
        userRepository.save(user);
        return UserMapper.INSTANCE.ToCreateUserResponse(user);
}

    public UserResponse getUserbyID(Long id){
        return userRepository.findById(id)
                .map(UserMapper.INSTANCE::ToUserResponse)
                .orElseThrow();
    }
    public String deleteUserbyID(Long id){
        if(!userRepository.existsById(id)){
            throw new RuntimeException("User does not exists");
        }
        userRepository.deleteById(id);
        return "User has been deleted";
    }
    public List<UserResponse> getAllUser(){
        List<User> users=userRepository.findAll();
        return users.stream()
                .map(UserMapper.INSTANCE::ToUserResponse)
                .toList();
    }
    public UserResponse updateUser(Long id, UpdateUserRequest Request){
            User user=userRepository.findById(id).orElseThrow();
            String currentfirstname=user.getFirstName();
            String currentlastname=user.getLastName();
            if(Request.getFirstName() != null && !Request.getFirstName().equals(currentfirstname)){
                user.setFirstName(Request.getFirstName());
            }
        if(Request.getLastName() != null && !Request.getLastName().equals(currentlastname)){
            user.setLastName(Request.getLastName());
        }
        if(!currentlastname.equals(user.getLastName()) || !currentfirstname.equals(user.getFirstName())){
            userRepository.save(user);
        }
            return UserMapper.INSTANCE.ToUserResponse(user);
    }
}
