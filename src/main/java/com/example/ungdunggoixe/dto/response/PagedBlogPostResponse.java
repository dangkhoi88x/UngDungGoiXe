package com.example.ungdunggoixe.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagedBlogPostResponse {
    private List<BlogPostPublicResponse> content;
    private long totalElements;
    private int totalPages;
    private int page;
    private int size;
}
