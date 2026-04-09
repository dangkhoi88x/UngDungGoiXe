package com.example.ungdunggoixe.mapper;

import com.example.ungdunggoixe.dto.request.CreateBookingRequest;
import com.example.ungdunggoixe.dto.request.UpdateBookingRequest;
import com.example.ungdunggoixe.dto.response.BookingResponse;
import com.example.ungdunggoixe.entity.Booking;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.factory.Mappers;

@Mapper
public interface BookingMapper {
    BookingMapper INSTANCE = Mappers.getMapper(BookingMapper.class);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "bookingCode", ignore = true)
    @Mapping(target = "renter", ignore = true)
    @Mapping(target = "vehicle", ignore = true)
    @Mapping(target = "station", ignore = true)
    @Mapping(target = "actualEndTime", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "checkedOutBy", ignore = true)
    @Mapping(target = "checkedInBy", ignore = true)
    @Mapping(target = "basePrice", ignore = true)
    @Mapping(target = "partiallyPaid", ignore = true)
    @Mapping(target = "extraFee", ignore = true)
    @Mapping(target = "totalAmount", ignore = true)
    @Mapping(target = "paymentStatus", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Booking toBooking(CreateBookingRequest request);

    @Mapping(target = "renterId", source = "renter.id")
    @Mapping(target = "renterName", expression = "java(booking.getRenter().getFirstName() + \" \" + booking.getRenter().getLastName())")
    @Mapping(target = "vehicleId", source = "vehicle.id")
    @Mapping(target = "vehicleName", source = "vehicle.name")
    @Mapping(target = "stationId", source = "station.id")
    @Mapping(target = "stationName", source = "station.name")
    @Mapping(target = "checkedOutById", source = "checkedOutBy.id")
    @Mapping(target = "checkedInById", source = "checkedInBy.id")
    BookingResponse toBookingResponse(Booking booking);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "bookingCode", ignore = true)
    @Mapping(target = "renter", ignore = true)
    @Mapping(target = "vehicle", ignore = true)
    @Mapping(target = "station", ignore = true)
    @Mapping(target = "checkedOutBy", ignore = true)
    @Mapping(target = "checkedInBy", ignore = true)
    @Mapping(target = "basePrice", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(UpdateBookingRequest request, @MappingTarget Booking booking);
}
