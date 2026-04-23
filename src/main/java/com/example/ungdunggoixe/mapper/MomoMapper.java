package com.example.ungdunggoixe.mapper;

import com.example.ungdunggoixe.configuration.MomoProperties;
import com.example.ungdunggoixe.dto.momo.CreatePaymentRequest;
import org.springframework.stereotype.Component;

@Component
public class MomoMapper {
    public CreatePaymentRequest toCreateRequest(
            MomoProperties properties,
            String requestId,
            String orderId,
            long amount,
            String orderInfo,
            String extraData,
            String signature
    ) {
        return CreatePaymentRequest.builder()
                .partnerCode(properties.getPartnerCode())
                .accessKey(properties.getAccessKey())
                .requestId(requestId)
                .orderId(orderId)
                .amount(amount)
                .orderInfo(orderInfo)
                .redirectUrl(properties.getReturnUrl())
                .ipnUrl(properties.getIpnUrl())
                .requestType(properties.getRequestType())
                .extraData(extraData == null ? "" : extraData)
                .lang(properties.getLang())
                .signature(signature)
                .build();
    }
}
