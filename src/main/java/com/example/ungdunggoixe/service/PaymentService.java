package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.dto.momo.CreatePaymentResponse;
import com.example.ungdunggoixe.dto.request.CreatePaymentRequest;
import com.example.ungdunggoixe.dto.response.PaymentResponse;
import com.example.ungdunggoixe.entity.Payment;

import java.time.LocalDateTime;
import java.util.List;

public interface PaymentService {
    PaymentResponse createPayment(CreatePaymentRequest request);
    PaymentResponse confirmPayment(Long paymentId);
    PaymentResponse confirmTopupPayment(Long paymentId);
    PaymentResponse confirmRefundPayment(Long paymentId);
    PaymentResponse failPayment(Long paymentId);
    List<PaymentResponse> getPaymentsByBookingId(Long bookingId);
    PaymentResponse getPaymentById(Long id);
    List<PaymentResponse> getPendingAdjustments(Payment.PaymentPurpose purpose);
    boolean handleMomoIpnResult(String orderId, Integer resultCode, Long momoTransId);
    boolean handleMomoIpnResult(String orderId, String extraData, Integer resultCode, Long momoTransId);
    CreatePaymentResponse createMomoPrepayTotal(Long bookingId, String momoRequestType);
    void expireMoMoPrepaidSlotIfStale(Long paymentId, LocalDateTime cutoff);
}
