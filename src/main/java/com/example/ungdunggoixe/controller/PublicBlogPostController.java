package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.BlogPostPublicResponse;
import com.example.ungdunggoixe.dto.response.PagedBlogPostResponse;
import com.example.ungdunggoixe.service.BlogPostService;
import com.example.ungdunggoixe.service.I18nService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping({"/blog/posts", "/api/blog/posts"})
@RequiredArgsConstructor
public class PublicBlogPostController {

    private final BlogPostService blogPostService;
    private final I18nService i18nService;

    @GetMapping
    public ApiResponse<PagedBlogPostResponse> listPublished(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "publishedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        PagedBlogPostResponse data = blogPostService.listPublished(keyword, page, size, sortBy, sortDir);
        return ApiResponse.<PagedBlogPostResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.blog_post.public.page.success"))
                .data(data)
                .timestamp(Instant.now())
                .build();
    }

    @GetMapping("/{slug}")
    public ApiResponse<BlogPostPublicResponse> getBySlug(@PathVariable String slug) {
        BlogPostPublicResponse data = blogPostService.getPublishedBySlug(slug);
        return ApiResponse.<BlogPostPublicResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.blog_post.public.get_by_slug.success"))
                .data(data)
                .timestamp(Instant.now())
                .build();
    }
}
