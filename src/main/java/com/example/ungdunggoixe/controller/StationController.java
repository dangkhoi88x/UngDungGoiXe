package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.request.CreateStationRequest;
import com.example.ungdunggoixe.dto.response.CreateStationResponse;
import com.example.ungdunggoixe.dto.response.StationResponse;
import com.example.ungdunggoixe.service.StationService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@AllArgsConstructor
@RequestMapping("/stations")
public class StationController {
    private final StationService stationService;

    @PostMapping

    public CreateStationResponse create(@RequestBody CreateStationRequest request) {
            return stationService.createStation(request);
    }
    @GetMapping("/{id}")
    public StationResponse getbyID(@PathVariable Long id){
        return stationService.getStationbyID(id);
    }
}
