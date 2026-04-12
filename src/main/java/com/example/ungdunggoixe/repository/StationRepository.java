package com.example.ungdunggoixe.repository;

import com.example.ungdunggoixe.entity.Station;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StationRepository  extends JpaRepository<Station, Long> {
        boolean existsByName(String name);
}
