package com.example.ungdunggoixe.repository;

import com.example.ungdunggoixe.entity.User;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    boolean existsByEmail(String email);

    @Query("SELECT COUNT(u) FROM User u WHERE u.email = :email AND u.id <> :id")
    long countByEmailAndIdNot(@Param("email") String email, @Param("id") Long id);

    @EntityGraph(attributePaths = {"userRoles", "userRoles.role", "userRoles.role.rolePermissions", "userRoles.role.rolePermissions.permission"})
    Optional<User> findByEmail(String email);

    @EntityGraph(attributePaths = {"userRoles", "userRoles.role", "userRoles.role.rolePermissions", "userRoles.role.rolePermissions.permission"})
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdWithUserRoles(@Param("id") Long id);

    @EntityGraph(attributePaths = {"userRoles", "userRoles.role", "userRoles.role.rolePermissions", "userRoles.role.rolePermissions.permission"})
    @Override
    Page<User> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"userRoles", "userRoles.role", "userRoles.role.rolePermissions", "userRoles.role.rolePermissions.permission"})
    @Override
    Page<User> findAll(Specification<User> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"userRoles", "userRoles.role", "userRoles.role.rolePermissions", "userRoles.role.rolePermissions.permission"})
    @Override
    java.util.List<User> findAll(Specification<User> spec);

    long countByCreatedAtGreaterThanEqual(java.time.LocalDateTime from);
}
