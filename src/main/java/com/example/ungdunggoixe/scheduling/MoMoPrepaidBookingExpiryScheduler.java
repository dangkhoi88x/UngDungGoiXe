package com.example.ungdunggoixe.scheduling;

import com.example.ungdunggoixe.common.BookingStatus;
import com.example.ungdunggoixe.entity.Payment;
import com.example.ungdunggoixe.repository.PaymentRepository;
import com.example.ungdunggoixe.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Giải phóng slot khi người dùng không hoàn tất thanh toán MoMo prepay tổng trong thời gian đơn hàng (TTL cổng MoMo).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MoMoPrepaidBookingExpiryScheduler {

    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;

    @Value("${app.booking.momo-prepaid-expiry-enabled:true}")
    private boolean expiryEnabled;

    @Value("${app.booking.momo-prepaid-expiration:100m}")
    private Duration momoPrepaidExpiration;

    @Scheduled(fixedDelayString = "${app.booking.momo-prepaid-expiry-scan-interval:PT5M}")
    public void expireStaleMomoPrepaidBookings() {
        if (!expiryEnabled) {
            return;
        }
        LocalDateTime cutoff = LocalDateTime.now().minus(momoPrepaidExpiration);
        List<Long> ids = paymentRepository.findPaymentIdsForMoMoPrepaidExpiry(
                Payment.PaymentMethod.MOMO,
                Payment.PaymentPurpose.PREPAID_TOTAL,
                cutoff,
                List.of(Payment.PaymentStatus.PENDING, Payment.PaymentStatus.FAILED),
                BookingStatus.PENDING);
        if (ids.isEmpty()) {
            return;
        }
        log.debug("MoMo prepay expiry sweep: {} candidate payment(s) before cutoff {}", ids.size(), cutoff);
        for (Long paymentId : ids) {
            try {
                paymentService.expireMoMoPrepaidSlotIfStale(paymentId, cutoff);
            } catch (Exception e) {
                log.warn("MoMo prepay expiry failed for paymentId={}", paymentId, e);
            }
        }
    }
}
