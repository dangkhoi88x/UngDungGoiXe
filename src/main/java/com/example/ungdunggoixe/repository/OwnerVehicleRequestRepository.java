package com.example.ungdunggoixe.repository;

import com.example.ungdunggoixe.common.OwnerVehicleRequestStatus;
import com.example.ungdunggoixe.entity.OwnerVehicleRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OwnerVehicleRequestRepository extends JpaRepository<OwnerVehicleRequest, Long> {
    List<OwnerVehicleRequest> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);
    List<OwnerVehicleRequest> findByStatusOrderByCreatedAtAsc(OwnerVehicleRequestStatus status);
    List<OwnerVehicleRequest> findAllByOrderByCreatedAtDesc();
    boolean existsByLicensePlateAndStatusIn(String licensePlate, List<OwnerVehicleRequestStatus> statuses);
}
