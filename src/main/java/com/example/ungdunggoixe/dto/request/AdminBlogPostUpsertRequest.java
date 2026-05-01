package com.example.ungdunggoixe.dto.request;

import com.example.ungdunggoixe.common.BlogPostStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AdminBlogPostUpsertRequest {
    private String slug;
    private String title;
    private String excerpt;
    private String content;
    private String coverImageUrl;
    /** Optional on create (defaults to DRAFT). */
    private BlogPostStatus status;
}
