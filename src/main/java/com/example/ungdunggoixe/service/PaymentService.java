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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private static final Set<String> MOMO_PREPAY_REQUEST_TYPES = Set.of("captureWallet", "payWithATM");

    /** Theo phản hồi lỗi MoMo (resultCode 22): tối thiểu 1.000 VND mỗi giao dịch. */
    private static final long MOMO_GATEWAY_MIN_VND = 1_000L;
    /** Thanh toán thẻ ATM nội địa: tài liệu MoMo yêu cầu tối thiểu 10.000 VND. */
    private static final long MOMO_GATEWAY_MIN_VND_ATM = 10_000L;
    private static final long MOMO_GATEWAY_MAX_VND = 50_000_000L;
    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final MomoService momoService;
    private final BookingService bookingService;

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
                .paymentPurpose(request.getPaymentPurpose() == null ? Payment.PaymentPurpose.DEPOSIT : request.getPaymentPurpose())
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
    public PaymentResponse confirmTopupPayment(Long paymentId) {
        Payment payment = requirePendingPaymentByPurpose(paymentId, Payment.PaymentPurpose.TOPUP);
        payment.setStatus(Payment.PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        resolveCurrentUser().ifPresent(payment::setProcessedBy);
        Payment saved = paymentRepository.save(payment);
        updateBookingPaymentStatus(saved.getBooking());
        return PaymentMapper.INSTANCE.toPaymentResponse(saved);
    }

    @Transactional
    public PaymentResponse confirmRefundPayment(Long paymentId) {
        Payment payment = requirePendingPaymentByPurpose(paymentId, Payment.PaymentPurpose.REFUND);
        payment.setStatus(Payment.PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        resolveCurrentUser().ifPresent(payment::setProcessedBy);
        Payment saved = paymentRepository.save(payment);
        updateBookingPaymentStatus(saved.getBooking());
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

    @Transactional(readOnly = true)
    public List<PaymentResponse> getPendingAdjustments(Payment.PaymentPurpose purpose) {
        assertStaffOrAdmin();
        if (purpose != Payment.PaymentPurpose.TOPUP && purpose != Payment.PaymentPurpose.REFUND) {
            throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
        }
        return paymentRepository.findByStatusAndPaymentPurposeOrderByCreatedAtAsc(
                        Payment.PaymentStatus.PENDING,
                        purpose
                ).stream()
                .map(PaymentMapper.INSTANCE::toPaymentResponse)
                .toList();
    }

    private void validateAmount(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.PAYMENT_AMOUNT_INVALID);
        }
        if (amount.scale() > 2) {
            throw new AppException(ErrorCode.PAYMENT_AMOUNT_INVALID);
        }
    }

    /**
     * Giới hạn số tiền gửi API MoMo create (VND nguyên) — tránh resultCode 22 và trả lỗi rõ cho người dùng.
     */
    private void validateMomoPrepayAmountVnd(long amountVnd, String momoRequestType) {
        if (amountVnd > MOMO_GATEWAY_MAX_VND) {
            throw new AppException(ErrorCode.PAYMENT_MOMO_PREPAY_AMOUNT_RANGE);
        }
        long min = "payWithATM".equals(momoRequestType) ? MOMO_GATEWAY_MIN_VND_ATM : MOMO_GATEWAY_MIN_VND;
        if (amountVnd < min) {
            throw new AppException(ErrorCode.PAYMENT_MOMO_PREPAY_AMOUNT_RANGE);
        }
    }

    private BigDecimal sumPaidForBooking(Long bookingId) {
        return paymentRepository.findByBookingId(bookingId).stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.PAID)
                .map(this::signedAmountForPaidPayment)
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

    private Payment requirePendingPaymentByPurpose(Long paymentId, Payment.PaymentPurpose purpose) {
        assertStaffOrAdmin();
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
        if (payment.getStatus() != Payment.PaymentStatus.PENDING) {
            throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
        }
        if (payment.getPaymentPurpose() != purpose) {
            throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
        }
        return payment;
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
        return handleMomoIpnResult(orderId, null, resultCode, momoTransId);
    }

    @Transactional
    public boolean handleMomoIpnResult(String orderId, String extraData, Integer resultCode, Long momoTransId) {
        if (orderId == null || orderId.isBlank() || resultCode == null) {
            return false;
        }

        Optional<Payment> opt = findPaymentByIpnMapping(orderId, extraData);
        if (opt.isEmpty()) {
            return false;
        }

        Payment payment = opt.get();
        Booking booking = payment.getBooking();
        if (resultCode == 0 && booking != null && booking.getStatus() == BookingStatus.CANCELLED) {
            log.warn(
                    "MoMo IPN success ignored for paymentId={} bookingId={} — booking already CANCELLED (e.g. prepay TTL released the slot). Reconcile manually if funds were captured.",
                    payment.getId(),
                    booking.getId());
            return true;
        }

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

    @Transactional
    public CreatePaymentResponse createMomoPrepayTotal(Long bookingId, String momoRequestType) {
        if (momoRequestType == null || momoRequestType.isBlank()) {
            throw new AppException(ErrorCode.MOMO_REQUEST_TYPE_INVALID);
        }
        String rt = momoRequestType.trim();
        if (!MOMO_PREPAY_REQUEST_TYPES.contains(rt)) {
            throw new AppException(ErrorCode.MOMO_REQUEST_TYPE_INVALID);
        }

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
        assertCanAccessBooking(booking);
        assertBookingAllowsNewPayment(booking);

        BigDecimal estimatedRental = booking.getTotalAmount() == null ? BigDecimal.ZERO : booking.getTotalAmount();
        BigDecimal depositAmount = booking.getVehicle() != null && booking.getVehicle().getDepositAmount() != null
                ? booking.getVehicle().getDepositAmount()
                : BigDecimal.ZERO;

        BigDecimal amount = estimatedRental.add(depositAmount).setScale(0, RoundingMode.HALF_UP);
        validateAmount(amount);

        long momoAmount;
        try {
            momoAmount = amount.longValueExact();
        } catch (ArithmeticException ex) {
            throw new AppException(ErrorCode.PAYMENT_AMOUNT_INVALID);
        }
        validateMomoPrepayAmountVnd(momoAmount, rt);

        Payment payment = Payment.builder()
                .booking(booking)
                .amount(amount)
                .paymentMethod(Payment.PaymentMethod.MOMO)
                 .paymentPurpose(Payment.PaymentPurpose.PREPAID_TOTAL)
                .momoRequestType(rt)
                .status(Payment.PaymentStatus.PENDING)
                .build();
        Payment saved = paymentRepository.save(payment);

        String orderId = "MOMO_PAY_" + saved.getId();
        saved.setTransactionId(orderId);
        paymentRepository.save(saved);

        String requestId = "REQ_" + UUID.randomUUID();
        String orderInfo = "Thanh toan truoc tong booking " + booking.getBookingCode();
        String extraData = "paymentId=" + saved.getId() + ";bookingId=" + booking.getId() + ";purpose=PREPAID_TOTAL";

        return momoService.createPayment(orderId, requestId, momoAmount, orderInfo, extraData, rt);
    }

    /**
     * Hết hạn thanh toán MoMo prepay tổng: đóng payment PENDING, hủy booking PENDING nếu chưa có khoản PAID nào,
     * để slot xe mở cho người khác (theo {@code app.booking.momo-prepaid-expiration}).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void expireMoMoPrepaidSlotIfStale(Long paymentId, LocalDateTime cutoff) {
        Payment payment = paymentRepository.findById(paymentId).orElse(null);
        if (payment == null) {
            return;
        }
        if (payment.getPaymentMethod() != Payment.PaymentMethod.MOMO
                || payment.getPaymentPurpose() != Payment.PaymentPurpose.PREPAID_TOTAL) {
            return;
        }
        if (payment.getCreatedAt() == null || !payment.getCreatedAt().isBefore(cutoff)) {
            return;
        }
        if (payment.getStatus() != Payment.PaymentStatus.PENDING
                && payment.getStatus() != Payment.PaymentStatus.FAILED) {
            return;
        }
        Booking booking = payment.getBooking();
        if (booking == null || booking.getStatus() != BookingStatus.PENDING) {
            return;
        }

        BigDecimal paid = sumPaidForBooking(booking.getId());
        if (paid.compareTo(BigDecimal.ZERO) > 0) {
            if (payment.getStatus() == Payment.PaymentStatus.PENDING) {
                payment.setStatus(Payment.PaymentStatus.FAILED);
                payment.setPaidAt(null);
                paymentRepository.save(payment);
                updateBookingPaymentStatus(booking);
            }
            return;
        }

        if (payment.getStatus() == Payment.PaymentStatus.PENDING) {
            payment.setStatus(Payment.PaymentStatus.FAILED);
            payment.setPaidAt(null);
            paymentRepository.save(payment);
        }

        bookingService.cancelBooking(booking.getId());
        bookingRepository
                .findById(booking.getId())
                .ifPresent(this::updateBookingPaymentStatus);
    }

    /**
     * Cập nhật {@link Booking#getPartiallyPaid()} = tổng payment PAID (tiền cọc + các lần trả)
     * và {@link Booking#getPaymentStatus()}.
     * Nếu booking đang PENDING và paymentStatus đạt PAID thì tự động chuyển sang CONFIRMED.
     */
    private void updateBookingPaymentStatus(Booking booking) {
        List<Payment> payments = paymentRepository.findByBookingId(booking.getId());

        BigDecimal totalPaid = payments.stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.PAID)
                .map(this::signedAmountForPaidPayment)
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

        if (booking.getStatus() == BookingStatus.PENDING && booking.getPaymentStatus() == PaymentStatus.PAID) {
            log.info(
                    "Auto-confirm booking {} because payment status became PAID (partiallyPaid={}, totalAmount={})",
                    booking.getId(),
                    booking.getPartiallyPaid(),
                    booking.getTotalAmount());
            booking.setStatus(BookingStatus.CONFIRMED);
        }

        bookingRepository.save(booking);
    }

    private BigDecimal signedAmountForPaidPayment(Payment payment) {
        BigDecimal amount = payment.getAmount() == null ? BigDecimal.ZERO : payment.getAmount();
        if (payment.getPaymentPurpose() == Payment.PaymentPurpose.REFUND) {
            return amount.negate();
        }
        return amount;
    }

    private Optional<Payment> findPaymentByIpnMapping(String orderId, String extraData) {
        Long paymentId = parsePaymentIdFromExtraData(extraData);
        if (paymentId != null) {
            Optional<Payment> byId = paymentRepository.findById(paymentId);
            if (byId.isPresent()) {
                return byId;
            }
        }
        return paymentRepository.findTopByTransactionIdOrderByIdDesc(orderId);
    }

    private Long parsePaymentIdFromExtraData(String extraData) {
        if (extraData == null || extraData.isBlank()) {
            return null;
        }
        String[] parts = extraData.split(";");
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.startsWith("paymentId=")) {
                continue;
            }
            String value = trimmed.substring("paymentId=".length()).trim();
            try {
                return Long.parseLong(value);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
