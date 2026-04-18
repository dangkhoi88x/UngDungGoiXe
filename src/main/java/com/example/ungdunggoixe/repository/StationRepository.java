package com.example.ungdunggoixe.repository;

import com.example.ungdunggoixe.common.StationStatus;
import com.example.ungdunggoixe.entity.Station;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StationRepository extends JpaRepository<Station, Long> {
    boolean existsByName(String name);

    @Query("""
        SELECT s FROM Station s
        WHERE (:status IS NULL OR s.status = :status)
          AND (
            LENGTH(TRIM(:keyword)) = 0
            OR LOWER(s.name) LIKE LOWER(CONCAT('%', TRIM(:keyword), '%'))
            OR LOWER(s.address) LIKE LOWER(CONCAT('%', TRIM(:keyword), '%'))
            OR LOWER(COALESCE(s.hotline, '')) LIKE LOWER(CONCAT('%', TRIM(:keyword), '%'))
            OR CAST(s.id AS string) LIKE CONCAT('%', TRIM(:keyword), '%')
          )
        """)
    Page<Station> findAdminPage(
            @Param("status") StationStatus status,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
