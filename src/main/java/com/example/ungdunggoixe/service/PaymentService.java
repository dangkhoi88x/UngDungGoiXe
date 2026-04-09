package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.common.PaymentStatus;
import com.example.ungdunggoixe.dto.request.CreatePaymentRequest;
import com.example.ungdunggoixe.dto.response.PaymentResponse;
import com.example.ungdunggoixe.entity.Booking;
import com.example.ungdunggoixe.entity.Payment;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.mapper.PaymentMapper;
import com.example.ungdunggoixe.repository.BookingRepository;
import com.example.ungdunggoixe.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;

    // ═══════════════════════════════════════════════════════
    // 1. TẠO THANH TOÁN (cọc hoặc thanh toán đầy đủ)
    // ═══════════════════════════════════════════════════════

    @Transactional
    public PaymentResponse createPayment(CreatePaymentRequest request) {
        if (request == null || request.getBookingId() == null || request.getAmount() == null) {
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }

        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        Payment payment = Payment.builder()
                .booking(booking)
                .amount(request.getAmount())
                .paymentMethod(request.getPaymentMethod())
                .status(Payment.PaymentStatus.PENDING)
                .transactionId(request.getTransactionId())
                .build();

        Payment saved = paymentRepository.save(payment);

        // Cập nhật partiallyPaid trên booking
        updateBookingPaymentStatus(booking);

        return PaymentMapper.INSTANCE.toPaymentResponse(saved);
    }

    // ═══════════════════════════════════════════════════════
    // 2. XÁC NHẬN THANH TOÁN
    // ═══════════════════════════════════════════════════════

    @Transactional
    public PaymentResponse confirmPayment(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        payment.setStatus(Payment.PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());

        Payment saved = paymentRepository.save(payment);

        // Cập nhật trạng thái thanh toán trên booking
        updateBookingPaymentStatus(payment.getBooking());

        return PaymentMapper.INSTANCE.toPaymentResponse(saved);
    }

    // ═══════════════════════════════════════════════════════
    // 3. ĐÁNH DẤU THẤT BẠI
    // ═══════════════════════════════════════════════════════

    @Transactional
    public PaymentResponse failPayment(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        payment.setStatus(Payment.PaymentStatus.FAILED);

        Payment saved = paymentRepository.save(payment);
        return PaymentMapper.INSTANCE.toPaymentResponse(saved);
    }

    // ═══════════════════════════════════════════════════════
    // 4. XEM THANH TOÁN
    // ═══════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<PaymentResponse> getPaymentsByBookingId(Long bookingId) {
        return paymentRepository.findByBookingId(bookingId).stream()
                .map(PaymentMapper.INSTANCE::toPaymentResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
        return PaymentMapper.INSTANCE.toPaymentResponse(payment);
    }

    // ═══════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════

    /**
     * Tính tổng số tiền đã thanh toán (PAID) cho booking,
     * rồi cập nhật Booking.paymentStatus và Booking.partiallyPaid.
     *
     * Logic:
     *   - Nếu tổng PAID >= totalAmount → PAID
     *   - Nếu tổng PAID > 0 nhưng < totalAmount → PARTIALLY_PAID
     *   - Nếu tổng PAID == 0 → PENDING
     */
    private void updateBookingPaymentStatus(Booking booking) {
        List<Payment> payments = paymentRepository.findByBookingId(booking.getId());

        BigDecimal totalPaid = payments.stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.PAID)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        booking.setPartiallyPaid(totalPaid);

        BigDecimal totalAmount = booking.getTotalAmount() == null ? BigDecimal.ZERO : booking.getTotalAmount();

        if (totalPaid.compareTo(totalAmount) >= 0) {
            booking.setPaymentStatus(PaymentStatus.PAID);
        } else if (totalPaid.compareTo(BigDecimal.ZERO) > 0) {
            booking.setPaymentStatus(PaymentStatus.PARTIALLY_PAID);
        } else {
            booking.setPaymentStatus(PaymentStatus.PENDING);
        }

        bookingRepository.save(booking);
    }
}
