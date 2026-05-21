package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.dto.momo.CreatePaymentResponse;
import com.example.ungdunggoixe.dto.momo.IpnCallbackRequest;

public interface MomoService {
    CreatePaymentResponse createPayment( String orderId, String requestId, long amount, String orderInfo, String extraData );
    CreatePaymentResponse createPayment( String orderId, String requestId, long amount, String orderInfo, String extraData, String requestType );
    String buildCreateRawSignature( String requestId, String orderId, long amount, String orderInfo, String extraData, String requestType );
    String signHmacSha256(String data, String secretKey);
    String buildIpnRawSignature(IpnCallbackRequest payload);
    boolean verifyIpnSignature(IpnCallbackRequest payload);
}
