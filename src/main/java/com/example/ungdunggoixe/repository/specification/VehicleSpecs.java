package com.example.ungdunggoixe.repository.specification;

import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.entity.Station;
import com.example.ungdunggoixe.entity.Vehicle;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;

public class VehicleSpecs {
    private VehicleSpecs() {
    }

    public static Specification<Vehicle> stationIdEquals(Long stationId) {
        return (root, query, cb) ->
                stationId == null ? cb.conjunction() : cb.equal(root.get("station").get("id"), stationId);
    }

    public static Specification<Vehicle> statusEquals(VehicleStatus status) {
        return (root, query, cb) ->
                status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    public static Specification<Vehicle> fuelTypeEquals(FuelType fuelType) {
        return (root, query, cb) ->
                fuelType == null ? cb.conjunction() : cb.equal(root.get("fuelType"), fuelType);
    }

    public static Specification<Vehicle> brandContains(String brand) {
        String normalized = normalize(brand);
        if (normalized == null) {
            return alwaysTrue();
        }
        return (root, query, cb) ->
                cb.like(cb.lower(cb.coalesce(root.get("brand"), "")), "%" + normalized + "%");
    }

    public static Specification<Vehicle> minCapacity(Integer minCapacity) {
        return (root, query, cb) ->
                minCapacity == null ? cb.conjunction() : cb.greaterThanOrEqualTo(root.get("capacity"), minCapacity);
    }

    public static Specification<Vehicle> minPrice(BigDecimal minPrice) {
        return (root, query, cb) ->
                minPrice == null ? cb.conjunction() : cb.greaterThanOrEqualTo(root.get("hourlyRate"), minPrice);
    }

    public static Specification<Vehicle> maxPrice(BigDecimal maxPrice) {
        return (root, query, cb) ->
                maxPrice == null ? cb.conjunction() : cb.lessThanOrEqualTo(root.get("hourlyRate"), maxPrice);
    }

    public static Specification<Vehicle> keywordContains(String keyword) {
        String normalized = normalize(keyword);
        if (normalized == null) {
            return alwaysTrue();
        }
        return (root, query, cb) -> {
            String pattern = "%" + normalized + "%";
            Join<Vehicle, Station> station = root.join("station", JoinType.LEFT);
            return cb.or(
                    cb.like(root.get("id").as(String.class), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("licensePlate"), "")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("name"), "")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("brand"), "")), pattern),
                    cb.like(cb.lower(root.get("status").as(String.class)), pattern),
                    cb.like(cb.lower(root.get("fuelType").as(String.class)), pattern),
                    cb.like(cb.lower(cb.coalesce(station.get("name"), "")), pattern)
            );
        };
    }

    public static Specification<Vehicle> alwaysTrue() {
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
