package com.example.ungdunggoixe.repository;

import com.example.ungdunggoixe.common.BlogPostStatus;
import com.example.ungdunggoixe.entity.BlogPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    Optional<BlogPost> findBySlug(String slug);

    @Query("""
            select b from BlogPost b
            where b.slug = :slug and b.status = com.example.ungdunggoixe.common.BlogPostStatus.PUBLISHED
            """)
    Optional<BlogPost> findPublishedBySlug(@Param("slug") String slug);

    Page<BlogPost> findByStatus(BlogPostStatus status, Pageable pageable);

    @Query("""
            select b from BlogPost b
            where b.status = com.example.ungdunggoixe.common.BlogPostStatus.PUBLISHED
            and (:keyword is null or :keyword = ''
                or lower(b.title) like lower(concat('%', :keyword, '%'))
                or lower(b.slug) like lower(concat('%', :keyword, '%')))
            """)
    Page<BlogPost> findPublishedPage(@Param("keyword") String keyword, Pageable pageable);

    @Query("""
            select b from BlogPost b
            where (:status is null or b.status = :status)
            and (:keyword is null or :keyword = ''
                or lower(b.title) like lower(concat('%', :keyword, '%'))
                or lower(b.slug) like lower(concat('%', :keyword, '%')))
            """)
    Page<BlogPost> findAdminPage(
            @Param("status") BlogPostStatus status,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
