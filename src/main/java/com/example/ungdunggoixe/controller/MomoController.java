package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.momo.CreatePaymentResponse;
import com.example.ungdunggoixe.dto.momo.IpnCallbackRequest;
import com.example.ungdunggoixe.configuration.MomoProperties;
import com.example.ungdunggoixe.dto.request.CreateMomoPaymentRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.service.I18nService;
import com.example.ungdunggoixe.service.MomoService;
import com.example.ungdunggoixe.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.util.StringUtils;

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
    private final MomoProperties momoProperties;

    @PostMapping("/create")
    @Operation(
            summary = "Tao giao dich MoMo",
            description = "Khoi tao giao dich thanh toan MoMo tra ve payUrl. Body co the truyen requestType (captureWallet, payWithATM); neu bo trong thi dung momo.request-type trong cau hinh.")
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

        String requestType = request.getRequestType();
        if (!StringUtils.hasText(requestType)) {
            requestType = momoProperties.getRequestType();
        }

        CreatePaymentResponse response = momoService.createPayment(
                orderId,
                requestId,
                request.getAmount(),
                request.getOrderInfo(),
                request.getExtraData(),
                requestType
        );
        return ApiResponse.success(response, i18nService.getMessage("response.momo.create.success"));
    }

    /**
     * MoMo IPN: POST JSON tới {@code ipnUrl}. Theo tài liệu Payment Notification, đối tác phản hồi
     * <strong>HTTP 204</strong> không body khi đã xử lý (chữ ký hợp lệ và khớp dữ liệu nội bộ).
     */
    @PostMapping("/ipn-handler")
    @Operation(
            summary = "MoMo IPN callback",
            description = "Nhan POST application/json tu MoMo, verify HMAC, cap nhat payment/booking. Tra 204 No Content khi xu ly thanh cong (dung MoMo Payment Notification).")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Da xu ly, dong y IPN"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Body thieu/sai hoac chu ky khong hop le"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Chu ky hop le nhung khong map duoc giao dich noi bo")
    })
    public ResponseEntity<Void> ipn(@RequestBody(required = false) IpnCallbackRequest payload) {
        if (payload == null || !StringUtils.hasText(payload.getOrderId())) {
            log.warn("MoMo IPN rejected: empty body or missing orderId");
            return ResponseEntity.badRequest().build();
        }

        log.info("MoMo IPN received orderId={}, requestId={}, resultCode={}, transId={}",
                payload.getOrderId(), payload.getRequestId(), payload.getResultCode(), payload.getTransId());

        if (!momoService.verifyIpnSignature(payload)) {
            log.warn("MoMo IPN signature invalid for orderId={}, requestId={}",
                    payload.getOrderId(), payload.getRequestId());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        boolean updated = paymentService.handleMomoIpnResult(
                payload.getOrderId(),
                payload.getExtraData(),
                payload.getResultCode(),
                payload.getTransId()
        );

        if (!updated) {
            log.warn("MoMo IPN could not map orderId={} to internal payment record", payload.getOrderId());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        return ResponseEntity.noContent().build();
    }
}
