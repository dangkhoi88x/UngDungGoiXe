package com.example.ungdunggoixe.mapper;

import com.example.ungdunggoixe.dto.request.CreateOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.request.UpdateOwnerVehicleRequest;
import com.example.ungdunggoixe.dto.response.OwnerVehicleRequestHistoryItemResponse;
import com.example.ungdunggoixe.dto.response.OwnerVehicleRequestResponse;
import com.example.ungdunggoixe.entity.OwnerVehicleRequestHistoryItem;
import com.example.ungdunggoixe.entity.OwnerVehicleRequest;
import org.mapstruct.*;
import org.mapstruct.factory.Mappers;

@Mapper
public interface OwnerVehicleRequestMapper {
    OwnerVehicleRequestMapper INSTANCE = Mappers.getMapper(OwnerVehicleRequestMapper.class);

    @BeanMapping(
            ignoreByDefault = true,
            nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
    )
    @VehicleRequestFields
    OwnerVehicleRequest toEntity(CreateOwnerVehicleRequest request);

    @BeanMapping(
            ignoreByDefault = true,
            nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
    )
    @VehicleRequestFields
    void updateEntity(UpdateOwnerVehicleRequest request, @MappingTarget OwnerVehicleRequest entity);

    @Mapping(target = "ownerId", source = "owner.id")
    @Mapping(target = "stationId", source = "station.id")
    @Mapping(target = "approvedVehicleId", source = "approvedVehicle.id")
    OwnerVehicleRequestResponse toResponse(OwnerVehicleRequest entity);

    OwnerVehicleRequestHistoryItemResponse toHistoryResponse(OwnerVehicleRequestHistoryItem item);

    @Mapping(target = "licensePlate", source = "licensePlate")
    @Mapping(target = "name", source = "name")
    @Mapping(target = "brand", source = "brand")
    @Mapping(target = "fuelType", source = "fuelType")
    @Mapping(target = "capacity", source = "capacity")
    @Mapping(target = "hourlyRate", source = "hourlyRate")
    @Mapping(target = "dailyRate", source = "dailyRate")
    @Mapping(target = "depositAmount", source = "depositAmount")
    @Mapping(target = "description", source = "description")
    @Mapping(target = "address", source = "address")
    @Mapping(target = "latitude", source = "latitude")
    @Mapping(target = "longitude", source = "longitude")
    @Mapping(target = "registrationDocUrl", source = "registrationDocUrl")
    @Mapping(target = "insuranceDocUrl", source = "insuranceDocUrl")
    @Mapping(target = "photos", source = "photos")
    @Mapping(target = "policies", source = "policies")
    @interface VehicleRequestFields {
    }
}
