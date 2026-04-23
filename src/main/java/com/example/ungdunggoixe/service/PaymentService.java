package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.BookingStatus;
import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.common.PaymentStatus;
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
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;

    @Transactional
    public PaymentResponse createPayment(CreatePaymentRequest request) {
        if (request == null || request.getBookingId() == null || request.getAmount() == null) {
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }

        Payment.PaymentMethod method = request.getPaymentMethod() == null
                ? Payment.PaymentMethod.CASH
                : request.getPaymentMethod();
        if (method != Payment.PaymentMethod.CASH) {
            throw new AppException(ErrorCode.PAYMENT_METHOD_NOT_ALLOWED);
        }

        validateAmount(request.getAmount());

        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        assertCanAccessBooking(booking);
        assertBookingAllowsNewPayment(booking);

        BigDecimal total = booking.getTotalAmount() == null ? BigDecimal.ZERO : booking.getTotalAmount();
        BigDecimal alreadyPaid = sumPaidForBooking(booking.getId());
        BigDecimal remaining = total.subtract(alreadyPaid);
        if (request.getAmount().compareTo(remaining) > 0) {
            throw new AppException(ErrorCode.PAYMENT_AMOUNT_INVALID);
        }

        Payment payment = Payment.builder()
                .booking(booking)
                .amount(request.getAmount().setScale(2, RoundingMode.HALF_UP))
                .paymentMethod(Payment.PaymentMethod.CASH)
                .status(Payment.PaymentStatus.PENDING)
                .transactionId(request.getTransactionId())
                .build();

        Payment saved = paymentRepository.save(payment);
        updateBookingPaymentStatus(booking);
        return PaymentMapper.INSTANCE.toPaymentResponse(saved);
    }

    @Transactional
    public PaymentResponse confirmPayment(Long paymentId) {
        assertStaffOrAdmin();

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        if (payment.getStatus() != Payment.PaymentStatus.PENDING) {
            throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
        }

        payment.setStatus(Payment.PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        resolveCurrentUser().ifPresent(payment::setProcessedBy);

        Payment saved = paymentRepository.save(payment);
        updateBookingPaymentStatus(payment.getBooking());
        return PaymentMapper.INSTANCE.toPaymentResponse(saved);
    }

    @Transactional
    public PaymentResponse failPayment(Long paymentId) {
        assertStaffOrAdmin();

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        if (payment.getStatus() != Payment.PaymentStatus.PENDING) {
            throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
        }

        payment.setStatus(Payment.PaymentStatus.FAILED);
        Payment saved = paymentRepository.save(payment);
        updateBookingPaymentStatus(payment.getBooking());
        return PaymentMapper.INSTANCE.toPaymentResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> getPaymentsByBookingId(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
        assertCanAccessBooking(booking);

        return paymentRepository.findByBookingId(bookingId).stream()
                .map(PaymentMapper.INSTANCE::toPaymentResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
        assertCanAccessBooking(payment.getBooking());
        return PaymentMapper.INSTANCE.toPaymentResponse(payment);
    }

    private void validateAmount(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.PAYMENT_AMOUNT_INVALID);
        }
        if (amount.scale() > 2) {
            throw new AppException(ErrorCode.PAYMENT_AMOUNT_INVALID);
        }
    }

    private BigDecimal sumPaidForBooking(Long bookingId) {
        return paymentRepository.findByBookingId(bookingId).stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.PAID)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void assertBookingAllowsNewPayment(Booking booking) {
        BookingStatus st = booking.getStatus();
        if (st == BookingStatus.CANCELLED || st == BookingStatus.COMPLETED) {
            throw new AppException(ErrorCode.PAYMENT_BOOKING_NOT_PAYABLE);
        }
    }

    private boolean isStaffOrAdmin(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        for (GrantedAuthority ga : auth.getAuthorities()) {
            String r = ga.getAuthority();
            if ("ROLE_ADMIN".equals(r) || "ROLE_SUPER_ADMIN".equals(r)
                    || "ROLE_ADMIN_".equals(r) || "ROLE_SUPER_ADMIN_".equals(r)) {
                return true;
            }
        }
        return false;
    }

    private void assertStaffOrAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!isStaffOrAdmin(auth)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
    }

    private void assertCanAccessBooking(Booking booking) {
        if (isStaffOrAdmin(SecurityContextHolder.getContext().getAuthentication())) {
            return;
        }
        long uid = requireCurrentUserId();
        if (booking.getRenter() == null || !booking.getRenter().getId().equals(uid)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
    }

    private long requireCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        try {
            return Long.parseLong(auth.getName());
        } catch (NumberFormatException e) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }

    private Optional<User> resolveCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }
        try {
            long id = Long.parseLong(auth.getName());
            return userRepository.findById(id);
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    /**
     * Handle MoMo IPN by partner orderId (mapped to {@link Payment#getTransactionId()}).
     * resultCode = 0 => PAID, otherwise FAILED.
     * This method is idempotent for repeated callbacks.
     *
     * @return true if a payment record is found and processed.
     */
    @Transactional
    public boolean handleMomoIpnResult(String orderId, Integer resultCode, Long momoTransId) {
        if (orderId == null || orderId.isBlank() || resultCode == null) {
            return false;
        }
        Optional<Payment> opt = paymentRepository.findTopByTransactionIdOrderByIdDesc(orderId);
        if (opt.isEmpty()) {
            return false;
        }

        Payment payment = opt.get();
        Payment.PaymentStatus current = payment.getStatus();
        Payment.PaymentStatus target = (resultCode == 0)
                ? Payment.PaymentStatus.PAID
                : Payment.PaymentStatus.FAILED;

        if (current == target) {
            return true;
        }
        if (current == Payment.PaymentStatus.PAID && target == Payment.PaymentStatus.FAILED) {
            // Do not downgrade an already paid transaction.
            return true;
        }

        payment.setStatus(target);
        if (target == Payment.PaymentStatus.PAID) {
            payment.setPaidAt(LocalDateTime.now());
        } else {
            payment.setPaidAt(null);
        }
        Payment saved = paymentRepository.save(payment);
        updateBookingPaymentStatus(saved.getBooking());
        return true;
    }

    /**
     * Cập nhật {@link Booking#getPartiallyPaid()} = tổng payment PAID (tiền cọc + các lần trả)
     * và {@link Booking#getPaymentStatus()}.
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
