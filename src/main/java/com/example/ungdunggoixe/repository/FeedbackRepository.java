package com.example.ungdunggoixe.repository;

import com.example.ungdunggoixe.entity.Feedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    @EntityGraph(attributePaths = {"booking", "booking.renter", "booking.vehicle"})
    Page<Feedback> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"booking", "renter"})
    Page<Feedback> findByBooking_Vehicle_IdOrderByCreatedAtDesc(Long vehicleId, Pageable pageable);

    Optional<Feedback> findByBooking_Id(Long bookingId);

    boolean existsByBooking_Id(Long bookingId);

    @Query("""
            SELECT AVG(f.vehicleRating)
            FROM Feedback f
            WHERE f.booking.vehicle.id = :vehicleId
              AND f.vehicleRating IS NOT NULL
            """)
    Double averageVehicleRatingForVehicle(@Param("vehicleId") Long vehicleId);
}
