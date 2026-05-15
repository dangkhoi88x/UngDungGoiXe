package com.example.ungdunggoixe.repository.specification;

import com.example.ungdunggoixe.common.BookingStatus;
import com.example.ungdunggoixe.common.PaymentStatus;
import com.example.ungdunggoixe.entity.Booking;
import com.example.ungdunggoixe.entity.Station;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.entity.Vehicle;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public class BookingSpecs {
    private BookingSpecs() {
    }

    public static Specification<Booking> renterIdEquals(Long renterId) {
        return (root, query, cb) ->
                renterId == null ? cb.conjunction() : cb.equal(root.get("renter").get("id"), renterId);
    }

    public static Specification<Booking> stationIdEquals(Long stationId) {
        return (root, query, cb) ->
                stationId == null ? cb.conjunction() : cb.equal(root.get("station").get("id"), stationId);
    }

    public static Specification<Booking> vehicleIdEquals(Long vehicleId) {
        return (root, query, cb) ->
                vehicleId == null ? cb.conjunction() : cb.equal(root.get("vehicle").get("id"), vehicleId);
    }

    public static Specification<Booking> statusEquals(BookingStatus status) {
        return (root, query, cb) ->
                status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    public static Specification<Booking> paymentStatusEquals(PaymentStatus paymentStatus) {
        return (root, query, cb) ->
                paymentStatus == null ? cb.conjunction() : cb.equal(root.get("paymentStatus"), paymentStatus);
    }

    public static Specification<Booking> startTimeFrom(LocalDateTime from) {
        return (root, query, cb) ->
                from == null ? cb.conjunction() : cb.greaterThanOrEqualTo(root.get("startTime"), from);
    }

    public static Specification<Booking> startTimeTo(LocalDateTime to) {
        return (root, query, cb) ->
                to == null ? cb.conjunction() : cb.lessThanOrEqualTo(root.get("startTime"), to);
    }

    public static Specification<Booking> createdAtFrom(LocalDateTime from) {
        return (root, query, cb) ->
                from == null ? cb.conjunction() : cb.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    public static Specification<Booking> createdAtTo(LocalDateTime to) {
        return (root, query, cb) ->
                to == null ? cb.conjunction() : cb.lessThanOrEqualTo(root.get("createdAt"), to);
    }

    public static Specification<Booking> keywordContains(String keyword) {
        String normalized = normalize(keyword);
        if (normalized == null) {
            return alwaysTrue();
        }
        return (root, query, cb) -> {
            String pattern = "%" + normalized + "%";
            Join<Booking, User> renter = root.join("renter", JoinType.LEFT);
            Join<Booking, Vehicle> vehicle = root.join("vehicle", JoinType.LEFT);
            Join<Booking, Station> station = root.join("station", JoinType.LEFT);

            Expression<String> renterFullName = cb.concat(
                    cb.concat(cb.coalesce(renter.get("firstName"), ""), " "),
                    cb.coalesce(renter.get("lastName"), "")
            );

            return cb.or(
                    cb.like(cb.lower(cb.coalesce(root.get("bookingCode"), "")), pattern),
                    cb.like(root.get("id").as(String.class), pattern),
                    cb.like(cb.lower(root.get("status").as(String.class)), pattern),
                    cb.like(cb.lower(root.get("paymentStatus").as(String.class)), pattern),
                    cb.like(cb.lower(cb.coalesce(renter.get("email"), "")), pattern),
                    cb.like(cb.lower(renterFullName), pattern),
                    cb.like(cb.lower(cb.coalesce(vehicle.get("name"), "")), pattern),
                    cb.like(cb.lower(cb.coalesce(station.get("name"), "")), pattern)
            );
        };
    }

    public static Specification<Booking> alwaysTrue() {
        return (root, query, cb) -> cb.conjunction();
    }

    private static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim().toLowerCase();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
