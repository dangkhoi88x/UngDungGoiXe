package com.example.ungdunggoixe.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
public class UserResponse {

    private Long id;
    private String email;
    private String firstName;
    private String lastName;

    @Builder.Default
    private List<String> roles = new ArrayList<>();
}
