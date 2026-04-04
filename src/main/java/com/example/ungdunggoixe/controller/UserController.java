package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.request.CreateUserRequest;
import com.example.ungdunggoixe.dto.request.UpdateUserRequest;
import com.example.ungdunggoixe.dto.response.CreateUserResponse;
import com.example.ungdunggoixe.dto.response.UserResponse;
import com.example.ungdunggoixe.service.UserService;
import lombok.NoArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;
    public UserController(UserService userService) {
        this.userService = userService;
    }
    @PostMapping
    public CreateUserResponse createUser(@RequestBody CreateUserRequest createUserRequest) {
        return userService.createUser(createUserRequest);
    }
    @GetMapping("/{id}")
    public UserResponse getUserById(@PathVariable Long id) {
            return userService.getUserbyID(id);
    }
    @GetMapping
    public List<UserResponse> getAllUsers() {
        return userService.getAllUser();
    }
    @PutMapping("/{id}")
    public UserResponse updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest request) {
            return userService.updateUser(id,request);
    }


    @DeleteMapping("/{id}")

    public String deleteUserById(@PathVariable Long id) {
        return userService.deleteUserbyID(id);
    }

    @GetMapping("/my-info")
    public UserResponse getMyInfo() {
        return userService.getMyInfo();
    }
}
