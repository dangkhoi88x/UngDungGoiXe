package com.example.ungdunggoixe.dto.response;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogPostPublicResponse {
    private Long id;
    private String slug;
    private String title;
    private String excerpt;
    private String content;
    private String coverImageUrl;
    private Instant publishedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
