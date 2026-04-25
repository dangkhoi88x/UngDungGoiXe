package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.configuration.MomoProperties;
import com.example.ungdunggoixe.dto.momo.CreatePaymentRequest;
import com.example.ungdunggoixe.dto.momo.CreatePaymentResponse;
import com.example.ungdunggoixe.dto.momo.IpnCallbackRequest;
import com.example.ungdunggoixe.mapper.MomoMapper;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

@Service
@Slf4j
@RequiredArgsConstructor
public class MomoService {
    private final MomoProperties momoProperties;
    private final MomoMapper momoMapper;
    private final I18nService i18nService;
    @Value("${momo.connect-timeout-ms:3000}")
    private int connectTimeoutMs;
    @Value("${momo.read-timeout-ms:8000}")
    private int readTimeoutMs;

    public CreatePaymentResponse createPayment(
            String orderId,
            String requestId,
            long amount,
            String orderInfo,
            String extraData
    ) {
        String safeExtra = extraData == null ? "" : extraData;
        String rawSignature = buildCreateRawSignature(requestId, orderId, amount, orderInfo, safeExtra);
        String signature = signHmacSha256(rawSignature, momoProperties.getSecretKey());
        CreatePaymentRequest request = momoMapper.toCreateRequest(
                momoProperties,
                requestId,
                orderId,
                amount,
                orderInfo,
                safeExtra,
                signature
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<CreatePaymentRequest> entity = new HttpEntity<>(request, headers);
        String endpoint = momoProperties.getEndpoint() + "/create";
        long started = System.currentTimeMillis();
        try {
            ResponseEntity<CreatePaymentResponse> response = buildRestTemplate().postForEntity(
                    endpoint,
                    entity,
                    CreatePaymentResponse.class
            );
            long elapsed = System.currentTimeMillis() - started;
            log.info("MoMo create payment completed in {} ms, orderId={}, requestId={}, status={}",
                    elapsed, orderId, requestId, response.getStatusCode().value());
            CreatePaymentResponse body = response.getBody();
            if (body == null) {
                throw new IllegalStateException(i18nService.getMessage("error.momo.empty_response"));
            }
            return body;
        } catch (ResourceAccessException e) {
            long elapsed = System.currentTimeMillis() - started;
            log.warn("MoMo create payment timeout/error after {} ms, orderId={}, requestId={}",
                    elapsed, orderId, requestId, e);
            throw new IllegalStateException(i18nService.getMessage("error.momo.connect_failed"), e);
        } catch (RestClientException e) {
            long elapsed = System.currentTimeMillis() - started;
            log.error("MoMo create payment failed after {} ms, orderId={}, requestId={}",
                    elapsed, orderId, requestId, e);
            throw new IllegalStateException(i18nService.getMessage("error.momo.request_failed"), e);
        }
    }

    /**
     * MoMo raw signature order for v2 create endpoint.
     */
    public String buildCreateRawSignature(
            String requestId,
            String orderId,
            long amount,
            String orderInfo,
            String extraData
    ) {
        return "accessKey=" + safe(momoProperties.getAccessKey()) +
                "&amount=" + amount +
                "&extraData=" + safe(extraData) +
                "&ipnUrl=" + safe(momoProperties.getIpnUrl()) +
                "&orderId=" + safe(orderId) +
                "&orderInfo=" + safe(orderInfo) +
                "&partnerCode=" + safe(momoProperties.getPartnerCode()) +
                "&redirectUrl=" + safe(momoProperties.getReturnUrl()) +
                "&requestId=" + safe(requestId) +
                "&requestType=" + safe(momoProperties.getRequestType());
    }

    public String signHmacSha256(String data, String secretKey) {
        if (!StringUtils.hasText(secretKey)) {
            throw new IllegalStateException(i18nService.getMessage("error.momo.secret_empty"));
        }
        try {
            Mac hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec key = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmac.init(key);
            byte[] hash = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException(i18nService.getMessage("error.momo.sign_failed"), e);
        }
    }

    /**
     * MoMo v2 raw signature order for IPN callback.
     */
    public String buildIpnRawSignature(IpnCallbackRequest payload) {
        return "accessKey=" + safe(momoProperties.getAccessKey()) +
                "&amount=" + (payload.getAmount() == null ? "" : payload.getAmount()) +
                "&extraData=" + safe(payload.getExtraData()) +
                "&message=" + safe(payload.getMessage()) +
                "&orderId=" + safe(payload.getOrderId()) +
                "&orderInfo=" + safe(payload.getOrderInfo()) +
                "&orderType=" + safe(payload.getOrderType()) +
                "&partnerCode=" + safe(payload.getPartnerCode()) +
                "&payType=" + safe(payload.getPayType()) +
                "&requestId=" + safe(payload.getRequestId()) +
                "&responseTime=" + (payload.getResponseTime() == null ? "" : payload.getResponseTime()) +
                "&resultCode=" + (payload.getResultCode() == null ? "" : payload.getResultCode()) +
                "&transId=" + (payload.getTransId() == null ? "" : payload.getTransId());
    }

    public boolean verifyIpnSignature(IpnCallbackRequest payload) {
        if (payload == null || !StringUtils.hasText(payload.getSignature())) {
            return false;
        }
        String raw = buildIpnRawSignature(payload);
        String expected = signHmacSha256(raw, momoProperties.getSecretKey());
        return expected.equalsIgnoreCase(payload.getSignature());
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }

    private RestTemplate buildRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        return new RestTemplate(factory);
    }
}
