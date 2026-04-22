package com.example.ungdunggoixe.mapper;

import com.example.ungdunggoixe.dto.request.CreateOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.request.UpdateOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.response.OwnerVehicleRequestResponse;
import com.example.ungdunggoixe.entity.OwnerVehicleRequest;
import org.mapstruct.*;
import org.mapstruct.factory.Mappers;

@Mapper
public interface OwnerVehicleRequestMapper {
    OwnerVehicleRequestMapper INSTANCE = Mappers.getMapper(OwnerVehicleRequestMapper.class);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "station", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "adminNote", ignore = true)
    @Mapping(target = "approvedVehicle", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    OwnerVehicleRequest toEntity(CreateOwnerVehicleRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "station", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "adminNote", ignore = true)
    @Mapping(target = "approvedVehicle", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(UpdateOwnerVehicleRequest request, @MappingTarget OwnerVehicleRequest entity);

    @Mapping(target = "ownerId", source = "owner.id")
    @Mapping(target = "stationId", source = "station.id")
    @Mapping(target = "approvedVehicleId", source = "approvedVehicle.id")
    OwnerVehicleRequestResponse toResponse(OwnerVehicleRequest entity);
}
