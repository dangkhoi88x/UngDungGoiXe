package com.example.ungdunggoixe.mapper;

import com.example.ungdunggoixe.configuration.MomoProperties;
import com.example.ungdunggoixe.dto.momo.CreatePaymentRequest;
import org.springframework.stereotype.Component;

@Component
public class MomoMapper {

    private static final String PAY_WITH_ATM = "payWithATM";

    public CreatePaymentRequest toCreateRequest(
            MomoProperties properties,
            String requestId,
            String orderId,
            long amount,
            String orderInfo,
            String extraData,
            String signature,
            String requestType
    ) {
        CreatePaymentRequest.CreatePaymentRequestBuilder b = CreatePaymentRequest.builder()
                .partnerCode(properties.getPartnerCode())
                .accessKey(properties.getAccessKey())
                .requestId(requestId)
                .orderId(orderId)
                .amount(amount)
                .orderInfo(orderInfo)
                .redirectUrl(properties.getReturnUrl())
                .ipnUrl(properties.getIpnUrl())
                .requestType(requestType)
                .extraData(extraData == null ? "" : extraData)
                .lang(properties.getLang())
                .signature(signature);

        if (PAY_WITH_ATM.equals(requestType)) {
            b.partnerName(properties.getPartnerName())
                    .storeId(properties.getStoreId());
        }
        return b.build();
    }
}
