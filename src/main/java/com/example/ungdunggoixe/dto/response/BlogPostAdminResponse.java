package com.example.ungdunggoixe.dto.response;

import com.example.ungdunggoixe.common.BlogPostStatus;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogPostAdminResponse {
    private Long id;
    private String slug;
    private String title;
    private String excerpt;
    private String content;
    private String coverImageUrl;
    private BlogPostStatus status;
    private Instant publishedAt;
    private Instant createdAt;
    private Instant updatedAt;
    private Long authorAdminId;
}
