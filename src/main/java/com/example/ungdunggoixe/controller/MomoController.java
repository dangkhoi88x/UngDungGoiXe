package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.momo.CreatePaymentResponse;
import com.example.ungdunggoixe.dto.momo.IpnAckResponse;
import com.example.ungdunggoixe.dto.momo.IpnCallbackRequest;
import com.example.ungdunggoixe.dto.request.CreateMomoPaymentRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.service.I18nService;
import com.example.ungdunggoixe.service.MomoService;
import com.example.ungdunggoixe.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
    private final I18nService i18nService;

    @PostMapping("/create")
    @Operation(summary = "Tao giao dich MoMo", description = "Khoi tao giao dich thanh toan MoMo tra ve payUrl.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Tao giao dich MoMo thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "amount/orderInfo khong hop le"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Loi ket noi/ky request voi MoMo")
    })
    public ApiResponse<CreatePaymentResponse> create(@RequestBody CreateMomoPaymentRequest request) {
        if (request == null || request.getAmount() == null || request.getAmount() <= 0
                || request.getOrderInfo() == null || request.getOrderInfo().isBlank()) {
            return ApiResponse.error(i18nService.getMessage("error.momo.create_request_invalid"));
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
        return ApiResponse.success(response, i18nService.getMessage("response.momo.create.success"));
    }

    /**
     * MoMo notifyUrl callback endpoint.
     * Update payment/booking status by resultCode (0 = PAID).
     */
    @PostMapping("/ipn-handler")
    @Operation(summary = "MoMo IPN callback", description = "Endpoint callback tu MoMo de cap nhat ket qua thanh toan.")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Da nhan callback va tra ACK cho MoMo")
    })
    public ResponseEntity<IpnAckResponse> ipn(@RequestBody IpnCallbackRequest payload) {
        log.info("MoMo IPN received orderId={}, requestId={}, resultCode={}, transId={}",
                payload.getOrderId(), payload.getRequestId(), payload.getResultCode(), payload.getTransId());

        boolean signatureValid = momoService.verifyIpnSignature(payload);
        if (!signatureValid) {
            log.warn("MoMo IPN signature invalid for orderId={}, requestId={}",
                    payload.getOrderId(), payload.getRequestId());
            return ResponseEntity.ok(IpnAckResponse.builder()
                    .resultCode(1001)
                    .message(i18nService.getMessage("response.momo.ipn.invalid_signature"))
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
                    .message(i18nService.getMessage("response.momo.ipn.payment_not_found"))
                    .build());
        }

        return ResponseEntity.ok(IpnAckResponse.builder()
                .resultCode(0)
                .message(i18nService.getMessage("response.common.success"))
                .build());
    }
}
