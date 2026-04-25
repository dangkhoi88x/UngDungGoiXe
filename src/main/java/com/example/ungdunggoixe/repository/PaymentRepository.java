package com.example.ungdunggoixe.repository;

import com.example.ungdunggoixe.common.BookingStatus;
import com.example.ungdunggoixe.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByBookingId(Long bookingId);
    List<Payment> findByStatusAndPaymentPurposeOrderByCreatedAtAsc(
            Payment.PaymentStatus status,
            Payment.PaymentPurpose paymentPurpose
    );
    Optional<Payment> findTopByTransactionIdOrderByIdDesc(String transactionId);

    /**
     * MoMo prepay đơn hết hạn / thất bại nhưng booking vẫn PENDING — cần giải phóng slot (job định kỳ).
     */
    @Query("""
            SELECT p.id FROM Payment p
            WHERE p.paymentMethod = :momoMethod
              AND p.paymentPurpose = :prepaidPurpose
              AND p.createdAt < :cutoff
              AND p.status IN :expirableStatuses
              AND p.booking.status = :bkPending
            """)
    List<Long> findPaymentIdsForMoMoPrepaidExpiry(
            @Param("momoMethod") Payment.PaymentMethod momoMethod,
            @Param("prepaidPurpose") Payment.PaymentPurpose prepaidPurpose,
            @Param("cutoff") LocalDateTime cutoff,
            @Param("expirableStatuses") List<Payment.PaymentStatus> expirableStatuses,
            @Param("bkPending") BookingStatus bkPending);
}
