package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.BookingStatus;
import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.common.PaymentStatus;
import com.example.ungdunggoixe.dto.momo.CreatePaymentResponse;
import com.example.ungdunggoixe.dto.request.CreatePaymentRequest;
import com.example.ungdunggoixe.dto.response.PaymentResponse;
import com.example.ungdunggoixe.entity.Booking;
import com.example.ungdunggoixe.entity.Payment;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.mapper.PaymentMapper;
import com.example.ungdunggoixe.repository.BookingRepository;
import com.example.ungdunggoixe.repository.PaymentRepository;
import com.example.ungdunggoixe.repository.UserRepository;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

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
