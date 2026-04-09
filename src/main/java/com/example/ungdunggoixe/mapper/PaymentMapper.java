package com.example.ungdunggoixe.mapper;

import com.example.ungdunggoixe.dto.response.PaymentResponse;
import com.example.ungdunggoixe.entity.Payment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

@Mapper
public interface PaymentMapper {
    PaymentMapper INSTANCE = Mappers.getMapper(PaymentMapper.class);

    @Mapping(target = "bookingId", source = "booking.id")
    @Mapping(target = "bookingCode", source = "booking.bookingCode")
    @Mapping(target = "processedById", source = "processedBy.id")
    PaymentResponse toPaymentResponse(Payment payment);
}
