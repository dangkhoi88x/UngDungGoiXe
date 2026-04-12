package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.dto.request.CreateVehicleRequest;
import com.example.ungdunggoixe.dto.request.UpdateVehicleRequest;
import com.example.ungdunggoixe.dto.response.CreateVehicleResponse;
import com.example.ungdunggoixe.service.VehicleService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
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

    /**
     * Search xe nâng cao:
     * GET /vehicles?stationId=1&brand=Toyota&minCapacity=4&fuelType=GASOLINE&minPrice=50000&maxPrice=200000
     * Tất cả params đều optional.
     */
    @GetMapping
    public List<CreateVehicleResponse> searchVehicles(
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) VehicleStatus status,
            @RequestParam(required = false) FuelType fuelType,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice
    ) {
        return vehicleService.searchVehicles(stationId, status, fuelType, brand, minCapacity, minPrice, maxPrice);
    }

    @GetMapping("/{id}")
    public CreateVehicleResponse getById(@PathVariable Long id) {
        return vehicleService.getVehicleById(id);
    }

    @PutMapping("/{id}")
    public CreateVehicleResponse update(@PathVariable Long id, @RequestBody UpdateVehicleRequest request) {
        return vehicleService.updateVehicle(id, request);
    }

    @DeleteMapping("/{id}")
    public String delete(@PathVariable Long id) {
        return vehicleService.deleteVehicle(id);
    }
}
