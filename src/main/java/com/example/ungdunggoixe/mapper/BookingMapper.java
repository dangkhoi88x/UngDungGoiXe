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

    @BeanMapping(
            ignoreByDefault = true,
            nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
    )
    @Mapping(target = "startTime", source = "startTime")
    @Mapping(target = "expectedEndTime", source = "expectedEndTime")
    @Mapping(target = "pickupNote", source = "pickupNote")
    Booking toBooking(CreateBookingRequest request);

    @Mapping(target = "renterId", source = "renter.id")
    @Mapping(target = "renterName", expression = "java(renterName(booking))")
    @Mapping(target = "vehicleId", source = "vehicle.id")
    @Mapping(target = "vehicleName", source = "vehicle.name")
    @Mapping(target = "stationId", source = "station.id")
    @Mapping(target = "stationName", source = "station.name")
    @Mapping(target = "checkedOutById", source = "checkedOutBy.id")
    @Mapping(target = "checkedInById", source = "checkedInBy.id")
    BookingResponse toBookingResponse(Booking booking);

    @BeanMapping(
            ignoreByDefault = true,
            nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
    )
    @Mapping(target = "startTime", source = "startTime")
    @Mapping(target = "expectedEndTime", source = "expectedEndTime")
    @Mapping(target = "actualEndTime", source = "actualEndTime")
    @Mapping(target = "status", source = "status")
    @Mapping(target = "paymentStatus", source = "paymentStatus")
    @Mapping(target = "partiallyPaid", source = "partiallyPaid")
    @Mapping(target = "extraFee", source = "extraFee")
    @Mapping(target = "totalAmount", source = "totalAmount")
    @Mapping(target = "pickupNote", source = "pickupNote")
    @Mapping(target = "returnNote", source = "returnNote")
    void updateEntity(UpdateBookingRequest request, @MappingTarget Booking booking);

    default String renterName(Booking booking) {
        if (booking == null || booking.getRenter() == null) {
            return null;
        }
        String firstName = booking.getRenter().getFirstName();
        String lastName = booking.getRenter().getLastName();
        return ((firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "")).trim();
    }
}
