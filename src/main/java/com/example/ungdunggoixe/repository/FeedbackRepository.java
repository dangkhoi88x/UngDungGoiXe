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

    @EntityGraph(attributePaths = {"booking", "booking.renter", "booking.vehicle"})
    @Query("""
            SELECT f
            FROM Feedback f
            LEFT JOIN f.booking b
            LEFT JOIN b.renter r
            LEFT JOIN b.vehicle v
            WHERE (:keyword IS NULL OR
                   LOWER(COALESCE(b.bookingCode, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
                   LOWER(COALESCE(r.email, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
                   LOWER(CONCAT(COALESCE(r.firstName, ''), ' ', COALESCE(r.lastName, ''))) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
                   LOWER(COALESCE(v.name, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
                   LOWER(COALESCE(f.comment, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:minRating IS NULL OR f.vehicleRating >= :minRating)
              AND (:hasPhotos IS NULL OR
                   (:hasPhotos = true AND SIZE(f.photoUrls) > 0) OR
                   (:hasPhotos = false AND SIZE(f.photoUrls) = 0))
            """)
    Page<Feedback> searchAdminFeedbacks(
            @Param("keyword") String keyword,
            @Param("minRating") Integer minRating,
            @Param("hasPhotos") Boolean hasPhotos,
            Pageable pageable
    );

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
