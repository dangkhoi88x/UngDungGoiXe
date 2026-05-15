package com.example.ungdunggoixe.repository.specification;

import com.example.ungdunggoixe.common.LicenseVerificationStatus;
import com.example.ungdunggoixe.entity.Role;
import com.example.ungdunggoixe.entity.User;
import com.example.ungdunggoixe.entity.UserRole;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

public class UserSpecs {
    private UserSpecs() {
    }

    public static Specification<User> licenseVerificationStatusEquals(LicenseVerificationStatus status) {
        return (root, query, cb) ->
                status == null ? cb.conjunction() : cb.equal(root.get("licenseVerificationStatus"), status);
    }

    public static Specification<User> keywordContains(String keyword) {
        String normalized = normalize(keyword);
        if (normalized == null) {
            return alwaysTrue();
        }
        return (root, query, cb) -> {
            query.distinct(true);

            String pattern = "%" + normalized + "%";
            Join<User, UserRole> userRoles = root.join("userRoles", JoinType.LEFT);
            Join<UserRole, Role> role = userRoles.join("role", JoinType.LEFT);

            Expression<String> fullName = cb.concat(
                    cb.concat(cb.coalesce(root.get("firstName"), ""), " "),
                    cb.coalesce(root.get("lastName"), "")
            );
            Expression<String> reverseFullName = cb.concat(
                    cb.concat(cb.coalesce(root.get("lastName"), ""), " "),
                    cb.coalesce(root.get("firstName"), "")
            );

            return cb.or(
                    cb.like(root.get("id").as(String.class), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("email"), "")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("firstName"), "")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("lastName"), "")), pattern),
                    cb.like(cb.lower(fullName), pattern),
                    cb.like(cb.lower(reverseFullName), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("phone"), "")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("identityNumber"), "")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("licenseNumber"), "")), pattern),
                    cb.like(cb.lower(root.get("licenseVerificationStatus").as(String.class)), pattern),
                    cb.like(cb.lower(cb.coalesce(role.get("name").as(String.class), "")), pattern)
            );
        };
    }

    public static Specification<User> alwaysTrue() {
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
