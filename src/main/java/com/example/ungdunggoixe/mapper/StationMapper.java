package com.example.ungdunggoixe.mapper;

import com.example.ungdunggoixe.dto.request.CreateStationRequest;
import com.example.ungdunggoixe.dto.request.UpdateStationRequest;
import com.example.ungdunggoixe.dto.response.CreateStationResponse;
import com.example.ungdunggoixe.dto.response.StationResponse;
import com.example.ungdunggoixe.entity.Station;
import org.mapstruct.*;
import org.mapstruct.factory.Mappers;

@Mapper
public interface StationMapper {
    StationMapper INSTANCE = Mappers.getMapper(StationMapper.class);

    @Mapping(target = "id",        ignore = true)
    @Mapping(target = "rating",    ignore = true)
    @Mapping(target = "status",    ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Station toStation(CreateStationRequest request);
    CreateStationResponse toCreateStationResponse(Station station);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(UpdateStationRequest request, @MappingTarget Station station);
    StationResponse toStationResponse(Station staion);
}
