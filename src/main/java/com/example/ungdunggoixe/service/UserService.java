package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.repository.UserRepository;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
public CreateUserResponse createUser(CreateUserRequest Request){

}
}
