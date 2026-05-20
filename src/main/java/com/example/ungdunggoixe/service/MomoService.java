package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.configuration.MomoProperties;
import com.example.ungdunggoixe.dto.momo.CreatePaymentRequest;
import com.example.ungdunggoixe.dto.momo.CreatePaymentResponse;
import com.example.ungdunggoixe.dto.momo.IpnCallbackRequest;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.mapper.MomoMapper;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Set;

public interface MomoService {
    CreatePaymentResponse createPayment( String orderId, String requestId, long amount, String orderInfo, String extraData );
    CreatePaymentResponse createPayment( String orderId, String requestId, long amount, String orderInfo, String extraData, String requestType );
    String buildCreateRawSignature( String requestId, String orderId, long amount, String orderInfo, String extraData, String requestType );
    String signHmacSha256(String data, String secretKey);
    String buildIpnRawSignature(IpnCallbackRequest payload);
    boolean verifyIpnSignature(IpnCallbackRequest payload);
}
