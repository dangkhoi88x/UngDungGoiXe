package com.example.ungdunggoixe.dto.request;

import lombok.Getter;

import java.time.LocalTime;

@Getter
public class CreateStationRequest {

    private String name;
    private String address;
    private String hotline;
    private String photo;
    private LocalTime startTime;
    private LocalTime endTime;

}
