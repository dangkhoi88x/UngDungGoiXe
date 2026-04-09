package com.example.ungdunggoixe.mapper;

import com.example.ungdunggoixe.dto.request.CreateVehicleRequest;
import com.example.ungdunggoixe.dto.response.CreateVehicleResponse;
import com.example.ungdunggoixe.entity.Vehicle;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.factory.Mappers;

@Mapper
public interface VehicleMapper {
    VehicleMapper INSTANCE = Mappers.getMapper(VehicleMapper.class);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Vehicle toVehicle(CreateVehicleRequest request);

    @Mapping(target = "stationId", source = "station.id")
    CreateVehicleResponse toCreateVehicleResponse(Vehicle vehicle);
}
