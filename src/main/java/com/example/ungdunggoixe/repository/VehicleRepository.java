package com.example.ungdunggoixe.repository;


import com.example.ungdunggoixe.common.FuelType;
import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.entity.Vehicle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle,Long> {
    boolean existsByLicensePlate(String licensePlate);
    boolean existsByLicensePlateAndIdNot(String licensePlate, Long id);

    /**
     * Search xe nâng cao: filter theo stationId, brand, capacity, fuelType, giá.
     * Tất cả các param đều optional (null = bỏ qua điều kiện đó).
     */
    @Query("""
        SELECT v FROM Vehicle v
        WHERE (:stationId IS NULL OR v.station.id = :stationId)
          AND (:status IS NULL OR v.status = :status)
          AND (:fuelType IS NULL OR v.fuelType = :fuelType)
          AND (:brand IS NULL OR LOWER(v.brand) LIKE LOWER(CONCAT('%', :brand, '%')))
          AND (:minCapacity IS NULL OR v.capacity >= :minCapacity)
          AND (:minPrice IS NULL OR v.hourlyRate >= :minPrice)
          AND (:maxPrice IS NULL OR v.hourlyRate <= :maxPrice)
        ORDER BY v.rating DESC, v.rentCount DESC
    """)
    List<Vehicle> searchVehicles(
            @Param("stationId") Long stationId,
            @Param("status") VehicleStatus status,
            @Param("fuelType") FuelType fuelType,
            @Param("brand") String brand,
            @Param("minCapacity") Integer minCapacity,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice
    );

    /**
     * Admin: phân trang + lọc; keyword rỗng = không lọc theo text.
     */
    @Query("""
        SELECT v FROM Vehicle v
        WHERE (:stationId IS NULL OR v.station.id = :stationId)
          AND (:status IS NULL OR v.status = :status)
          AND (:fuelType IS NULL OR v.fuelType = :fuelType)
          AND (
            LENGTH(TRIM(:keyword)) = 0
            OR LOWER(v.licensePlate) LIKE LOWER(CONCAT('%', TRIM(:keyword), '%'))
            OR LOWER(COALESCE(v.name, '')) LIKE LOWER(CONCAT('%', TRIM(:keyword), '%'))
            OR LOWER(COALESCE(v.brand, '')) LIKE LOWER(CONCAT('%', TRIM(:keyword), '%'))
            OR LOWER(COALESCE(v.station.name, '')) LIKE LOWER(CONCAT('%', TRIM(:keyword), '%'))
            OR CAST(v.id AS string) LIKE CONCAT('%', TRIM(:keyword), '%')
          )
        """)
    Page<Vehicle> findAdminPage(
            @Param("stationId") Long stationId,
            @Param("status") VehicleStatus status,
            @Param("fuelType") FuelType fuelType,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
