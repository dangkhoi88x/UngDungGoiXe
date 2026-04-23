package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.momo.CreatePaymentResponse;
import com.example.ungdunggoixe.dto.momo.IpnAckResponse;
import com.example.ungdunggoixe.dto.momo.IpnCallbackRequest;
import com.example.ungdunggoixe.dto.request.CreateMomoPaymentRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.service.MomoService;
import com.example.ungdunggoixe.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/momo")
public class MomoController {
    private final MomoService momoService;
    private final PaymentService paymentService;

    @PostMapping("/create")
    public ApiResponse<CreatePaymentResponse> create(@RequestBody CreateMomoPaymentRequest request) {
        if (request == null || request.getAmount() == null || request.getAmount() <= 0
                || request.getOrderInfo() == null || request.getOrderInfo().isBlank()) {
            return ApiResponse.error("amount và orderInfo là bắt buộc.");
        }

        String orderId = request.getOrderId();
        if (orderId == null || orderId.isBlank()) {
            orderId = "MOMO_" + Instant.now().toEpochMilli();
        }
        String requestId = request.getRequestId();
        if (requestId == null || requestId.isBlank()) {
            requestId = "REQ_" + UUID.randomUUID();
        }

        CreatePaymentResponse response = momoService.createPayment(
                orderId,
                requestId,
                request.getAmount(),
                request.getOrderInfo(),
                request.getExtraData()
        );
        return ApiResponse.success(response, "Create MoMo payment successful");
    }

    /**
     * MoMo notifyUrl callback endpoint.
     * Update payment/booking status by resultCode (0 = PAID).
     */
    @PostMapping("/ipn-handler")
    public ResponseEntity<IpnAckResponse> ipn(@RequestBody IpnCallbackRequest payload) {
        log.info("MoMo IPN received orderId={}, requestId={}, resultCode={}, transId={}",
                payload.getOrderId(), payload.getRequestId(), payload.getResultCode(), payload.getTransId());

        boolean signatureValid = momoService.verifyIpnSignature(payload);
        if (!signatureValid) {
            log.warn("MoMo IPN signature invalid for orderId={}, requestId={}",
                    payload.getOrderId(), payload.getRequestId());
            return ResponseEntity.ok(IpnAckResponse.builder()
                    .resultCode(1001)
                    .message("Invalid signature")
                    .build());
        }

        boolean updated = paymentService.handleMomoIpnResult(
                payload.getOrderId(),
                payload.getResultCode(),
                payload.getTransId()
        );

        if (!updated) {
            log.warn("MoMo IPN could not map orderId={} to internal payment record", payload.getOrderId());
            return ResponseEntity.ok(IpnAckResponse.builder()
                    .resultCode(1001)
                    .message("Payment not found")
                    .build());
        }

        return ResponseEntity.ok(IpnAckResponse.builder()
                .resultCode(0)
                .message("Success")
                .build());
    }
}
