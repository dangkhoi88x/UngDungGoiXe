package com.example.ungdunggoixe.repository;

import com.example.ungdunggoixe.entity.BlacklistedToken;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BlacklistedTokenRepository extends CrudRepository<BlacklistedToken, String> {
}
