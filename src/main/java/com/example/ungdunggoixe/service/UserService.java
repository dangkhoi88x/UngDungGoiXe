package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.common.RoleName;
import com.example.ungdunggoixe.dto.request.CreateUserRequest;
import com.example.ungdunggoixe.dto.request.UpdateUserRequest;
import com.example.ungdunggoixe.dto.response.CreateUserResponse;
import com.example.ungdunggoixe.dto.response.UserResponse;
import com.example.ungdunggoixe.entity.Role;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.dto.response.PagedUserResponse;
import com.example.ungdunggoixe.mapper.UserMapper;
import com.example.ungdunggoixe.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {
    private static final Set<String> USER_SORT_FIELDS = Set.of("id", "email", "firstName", "lastName");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleService roleService;

    public CreateUserResponse createUser(CreateUserRequest Request){
            String email=Request.getEmail();
            if(userRepository.existsByEmail(email)){
                throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }
        User user= UserMapper.INSTANCE.ToUser(Request);
        user.setPassword(passwordEncoder.encode(Request.getPassword()));
        Role role = roleService.createRole(RoleName.USER);
        user.addRole(role);
        userRepository.save(user);
        return UserMapper.INSTANCE.ToCreateUserResponse(user);
}

    public UserResponse getUserbyID(Long id){
        return userRepository.findById(id)
                .map(UserMapper.INSTANCE::ToUserResponse)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }
    public String deleteUserbyID(Long id){
        if(!userRepository.existsById(id)){
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }
        userRepository.deleteById(id);
        return "User has been deleted";
    }
//    /**

    public List<UserResponse> getAllUser(){
        List<User> users=userRepository.findAll();
        return users.stream()
                .map(UserMapper.INSTANCE::ToUserResponse)
                .toList();
    }

    public PagedUserResponse getUsersPaged(int page, int size, String sortBy, String sortDir) {
        String field = USER_SORT_FIELDS.contains(sortBy) ? sortBy : "id";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, field));
        Page<User> result = userRepository.findAll(pageable);
        Page<UserResponse> mapped = result.map(UserMapper.INSTANCE::ToUserResponse);
        return PagedUserResponse.builder()
                .content(mapped.getContent())
                .totalElements(mapped.getTotalElements())
                .totalPages(mapped.getTotalPages())
                .page(mapped.getNumber())
                .size(mapped.getSize())
                .build();
    }

    public UserResponse updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String email = request.getEmail().trim();
            if (!email.equals(user.getEmail()) && userRepository.countByEmailAndIdNot(email, id) > 0) {
                throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }
            user.setEmail(email);
        }
        if (request.getFirstName() != null && !request.getFirstName().isBlank()) {
            user.setFirstName(request.getFirstName().trim());
        }
        if (request.getLastName() != null && !request.getLastName().isBlank()) {
            user.setLastName(request.getLastName().trim());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        userRepository.save(user);
        return UserMapper.INSTANCE.ToUserResponse(user);
    }

    public UserResponse getMyInfo(){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if(authentication == null)
            throw new RuntimeException("Authentication is null");
        Long userID = Long.parseLong(authentication.getName());
        User user = userRepository.findById(userID).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return UserMapper.INSTANCE.ToUserResponse(user);
    }
}
