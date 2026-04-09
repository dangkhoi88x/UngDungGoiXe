package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.dto.request.CreateVehicleRequest;
import com.example.ungdunggoixe.dto.response.CreateVehicleResponse;
import com.example.ungdunggoixe.service.VehicleService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@AllArgsConstructor
@RequestMapping("/vehicles")
public class VehicleController {
    private final VehicleService vehicleService;

    @PostMapping
    public CreateVehicleResponse create(@RequestBody CreateVehicleRequest request) {
        return vehicleService.create(request);
    }

    @GetMapping
    public List<CreateVehicleResponse> getVehicles(
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) VehicleStatus status,
            @RequestParam(required = false) FuelType fuelType
    ) {
        return vehicleService.getVehicles(stationId, status, fuelType);
    }
}
