package com.example.ungdunggoixe.repository;

import com.example.ungdunggoixe.common.BookingStatus;
import com.example.ungdunggoixe.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.math.BigDecimal;
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

    @Query("""
            SELECT COALESCE(SUM(
                CASE
                    WHEN p.paymentPurpose = com.example.ungdunggoixe.entity.Payment$PaymentPurpose.REFUND
                        THEN -p.amount
                    ELSE p.amount
                END
            ), 0)
            FROM Payment p
            WHERE p.status = com.example.ungdunggoixe.entity.Payment$PaymentStatus.PAID
              AND COALESCE(p.paidAt, p.createdAt) >= :from
              AND COALESCE(p.paidAt, p.createdAt) < :to
            """)
    BigDecimal sumNetPaidAmountBetween(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    @Query("""
            SELECT COALESCE(SUM(
                CASE
                    WHEN p.paymentPurpose = com.example.ungdunggoixe.entity.Payment$PaymentPurpose.REFUND
                        THEN -p.amount
                    ELSE p.amount
                END
            ), 0)
            FROM Payment p
            JOIN p.booking b
            JOIN b.vehicle v
            WHERE p.status = com.example.ungdunggoixe.entity.Payment$PaymentStatus.PAID
              AND EXISTS (
                  SELECT 1
                  FROM OwnerVehicleRequest ovr
                  WHERE ovr.approvedVehicle = v
                    AND ovr.owner.id = :ownerId
              )
            """)
    BigDecimal sumOwnerVehicleNetPaidAmount(@Param("ownerId") Long ownerId);

    @Query("""
            SELECT COALESCE(SUM(
                CASE
                    WHEN p.paymentPurpose = com.example.ungdunggoixe.entity.Payment$PaymentPurpose.REFUND
                        THEN -p.amount
                    ELSE p.amount
                END
            ), 0)
            FROM Payment p
            JOIN p.booking b
            JOIN b.vehicle v
            WHERE p.status = com.example.ungdunggoixe.entity.Payment$PaymentStatus.PAID
              AND COALESCE(p.paidAt, p.createdAt) >= :from
              AND COALESCE(p.paidAt, p.createdAt) < :to
              AND EXISTS (
                  SELECT 1
                  FROM OwnerVehicleRequest ovr
                  WHERE ovr.approvedVehicle = v
                    AND ovr.owner.id = :ownerId
              )
            """)
    BigDecimal sumOwnerVehicleNetPaidAmountBetween(
            @Param("ownerId") Long ownerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    @Query("""
            SELECT b.vehicle.id,
                   COALESCE(v.name, ''),
                   COALESCE(v.licensePlate, ''),
                   COALESCE(SUM(
                       CASE
                           WHEN p.paymentPurpose = com.example.ungdunggoixe.entity.Payment$PaymentPurpose.REFUND
                               THEN -p.amount
                           ELSE p.amount
                       END
                   ), 0)
            FROM Payment p
            JOIN p.booking b
            JOIN b.vehicle v
            WHERE p.status = com.example.ungdunggoixe.entity.Payment$PaymentStatus.PAID
              AND b.vehicle IS NOT NULL
            GROUP BY b.vehicle.id, v.name, v.licensePlate
            ORDER BY COALESCE(SUM(
                       CASE
                           WHEN p.paymentPurpose = com.example.ungdunggoixe.entity.Payment$PaymentPurpose.REFUND
                               THEN -p.amount
                           ELSE p.amount
                       END
                   ), 0) DESC
            """)
    List<Object[]> findTopVehicleRevenueRows(org.springframework.data.domain.Pageable pageable);

    @Query("""
            SELECT b.vehicle.id,
                   COALESCE(v.name, ''),
                   COALESCE(v.licensePlate, ''),
                   COUNT(DISTINCT CASE
                       WHEN b.status = com.example.ungdunggoixe.common.BookingStatus.COMPLETED
                           THEN b.id
                       ELSE NULL
                   END),
                   COALESCE(SUM(
                       CASE
                           WHEN p.paymentPurpose = com.example.ungdunggoixe.entity.Payment$PaymentPurpose.REFUND
                               THEN -p.amount
                           ELSE p.amount
                       END
                   ), 0)
            FROM Payment p
            JOIN p.booking b
            JOIN b.vehicle v
            WHERE p.status = com.example.ungdunggoixe.entity.Payment$PaymentStatus.PAID
              AND EXISTS (
                  SELECT 1
                  FROM OwnerVehicleRequest ovr
                  WHERE ovr.approvedVehicle = v
                    AND ovr.owner.id = :ownerId
              )
            GROUP BY b.vehicle.id, v.name, v.licensePlate
            ORDER BY COALESCE(SUM(
                       CASE
                           WHEN p.paymentPurpose = com.example.ungdunggoixe.entity.Payment$PaymentPurpose.REFUND
                               THEN -p.amount
                           ELSE p.amount
                       END
                   ), 0) DESC
            """)
    List<Object[]> findOwnerVehicleRevenueRows(
            @Param("ownerId") Long ownerId,
            org.springframework.data.domain.Pageable pageable
    );
}
