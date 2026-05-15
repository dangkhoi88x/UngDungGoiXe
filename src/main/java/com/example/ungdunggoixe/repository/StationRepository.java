package com.example.ungdunggoixe.repository;

import com.example.ungdunggoixe.entity.Station;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface StationRepository extends JpaRepository<Station, Long>, JpaSpecificationExecutor<Station> {
    boolean existsByName(String name);
}
