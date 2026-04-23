package com.example.ungdunggoixe.repository;

import com.example.ungdunggoixe.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByBookingId(Long bookingId);
    Optional<Payment> findTopByTransactionIdOrderByIdDesc(String transactionId);
}
