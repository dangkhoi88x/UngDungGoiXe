package com.example.ungdunggoixe.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagedBlogPostAdminResponse {
    private List<BlogPostAdminResponse> content;
    private long totalElements;
    private int totalPages;
    private int page;
    private int size;
}
