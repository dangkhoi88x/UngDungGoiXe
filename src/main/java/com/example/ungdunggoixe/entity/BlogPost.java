package com.example.ungdunggoixe.entity;

import com.example.ungdunggoixe.common.BlogPostStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(
        name = "blog_post",
        indexes = {
                @Index(name = "idx_blog_post_slug", columnList = "slug", unique = true),
                @Index(name = "idx_blog_post_status_published_at", columnList = "status,published_at")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlogPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 220)
    private String slug;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(length = 600)
    private String excerpt;

    @Column(name = "content", nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "cover_image_url", length = 1024)
    private String coverImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private BlogPostStatus status = BlogPostStatus.DRAFT;

    @Column(name = "published_at")
    private Instant publishedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "author_admin_id")
    private Long authorAdminId;
}
