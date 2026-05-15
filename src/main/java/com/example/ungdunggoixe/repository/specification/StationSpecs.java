package com.example.ungdunggoixe.repository.specification;

import com.example.ungdunggoixe.common.StationStatus;
import com.example.ungdunggoixe.entity.Station;
import org.springframework.data.jpa.domain.Specification;

public class StationSpecs {
    private StationSpecs() {
    }

    public static Specification<Station> statusEquals(StationStatus status) {
        return (root, query, cb) ->
                status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    public static Specification<Station> keywordContains(String keyword) {
        String normalized = normalize(keyword);
        if (normalized == null) {
            return alwaysTrue();
        }
        return (root, query, cb) -> {
            String pattern = "%" + normalized + "%";
            return cb.or(
                    cb.like(root.get("id").as(String.class), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("name"), "")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("address"), "")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("hotline"), "")), pattern),
                    cb.like(cb.lower(root.get("status").as(String.class)), pattern)
            );
        };
    }

    public static Specification<Station> alwaysTrue() {
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
