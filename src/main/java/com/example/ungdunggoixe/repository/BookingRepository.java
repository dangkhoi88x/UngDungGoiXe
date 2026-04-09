package com.example.ungdunggoixe.repository;

import com.example.ungdunggoixe.common.BookingStatus;
import com.example.ungdunggoixe.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface BookingRepository  extends JpaRepository<Booking, Long> {
        boolean existsByBookingCode(String bookingCode);
        List<Booking> findByRenterId(Long renterId);
        List<Booking> findByStationId(Long stationId);
        List<Booking> findByStatus(BookingStatus status);

        /**
         * Tìm các booking đang hoạt động (PENDING / CONFIRMED / ONGOING)
         * mà khoảng thời gian [startTime, expectedEndTime] bị giao nhau với
         * khoảng [requestedStart, requestedEnd].
         * Dùng để chống double-booking.
         */
        @Query("""
            SELECT COUNT(b) > 0 FROM Booking b
            WHERE b.vehicle.id = :vehicleId
              AND b.status IN :activeStatuses
              AND b.startTime < :requestedEnd
              AND b.expectedEndTime > :requestedStart
        """)
        boolean existsOverlappingBooking(
                @Param("vehicleId") Long vehicleId,
                @Param("activeStatuses") List<BookingStatus> activeStatuses,
                @Param("requestedStart") LocalDateTime requestedStart,
                @Param("requestedEnd") LocalDateTime requestedEnd
        );

        /**
         * Tìm tất cả booking đang hoạt động của một xe (để kiểm tra xe có đang bận không)
         */
        @Query("""
            SELECT b FROM Booking b
            WHERE b.vehicle.id = :vehicleId
              AND b.status IN :activeStatuses
              AND b.startTime < :requestedEnd
              AND b.expectedEndTime > :requestedStart
        """)
        List<Booking> findOverlappingBookings(
                @Param("vehicleId") Long vehicleId,
                @Param("activeStatuses") List<BookingStatus> activeStatuses,
                @Param("requestedStart") LocalDateTime requestedStart,
                @Param("requestedEnd") LocalDateTime requestedEnd
        );
}
