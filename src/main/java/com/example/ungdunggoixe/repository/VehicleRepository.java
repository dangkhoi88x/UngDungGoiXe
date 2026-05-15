package com.example.ungdunggoixe.repository;

import com.example.ungdunggoixe.common.VehicleStatus;
import com.example.ungdunggoixe.entity.Vehicle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle,Long>, JpaSpecificationExecutor<Vehicle> {
    boolean existsByLicensePlate(String licensePlate);
    boolean existsByLicensePlateAndIdNot(String licensePlate, Long id);
    long countByStatus(VehicleStatus status);

    @Override
    @EntityGraph(attributePaths = "station")
    Page<Vehicle> findAll(org.springframework.data.jpa.domain.Specification<Vehicle> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "station")
    List<Vehicle> findAll(org.springframework.data.jpa.domain.Specification<Vehicle> spec);

    @Override
    @EntityGraph(attributePaths = "station")
    List<Vehicle> findAll(org.springframework.data.jpa.domain.Specification<Vehicle> spec, org.springframework.data.domain.Sort sort);
}
