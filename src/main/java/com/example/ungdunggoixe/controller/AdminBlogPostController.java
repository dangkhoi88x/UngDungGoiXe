package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.common.BlogPostStatus;
import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.dto.request.AdminBlogPostUpsertRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.BlogPostAdminResponse;
import com.example.ungdunggoixe.dto.response.PagedBlogPostAdminResponse;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.service.BlogPostService;
import com.example.ungdunggoixe.service.I18nService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping({"/admin/blog/posts", "/api/admin/blog/posts"})
@RequiredArgsConstructor
public class AdminBlogPostController {

    private final BlogPostService blogPostService;
    private final I18nService i18nService;

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @GetMapping
    public ApiResponse<PagedBlogPostAdminResponse> list(
            @RequestParam(required = false) BlogPostStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "updatedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        PagedBlogPostAdminResponse data =
                blogPostService.listAdmin(status, keyword, page, size, sortBy, sortDir);
        return ApiResponse.<PagedBlogPostAdminResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.blog_post.admin.page.success"))
                .data(data)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @GetMapping("/{id}")
    public ApiResponse<BlogPostAdminResponse> getById(@PathVariable Long id) {
        BlogPostAdminResponse data = blogPostService.getAdminById(id);
        return ApiResponse.<BlogPostAdminResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.blog_post.admin.get_by_id.success"))
                .data(data)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @PostMapping
    public ApiResponse<BlogPostAdminResponse> create(
            @RequestBody AdminBlogPostUpsertRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long authorId = parseUserId(jwt);
        BlogPostAdminResponse data = blogPostService.create(request, authorId);
        return ApiResponse.<BlogPostAdminResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.blog_post.admin.create.success"))
                .data(data)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @PutMapping("/{id}")
    public ApiResponse<BlogPostAdminResponse> update(
            @PathVariable Long id,
            @RequestBody AdminBlogPostUpsertRequest request
    ) {
        BlogPostAdminResponse data = blogPostService.update(id, request);
        return ApiResponse.<BlogPostAdminResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.blog_post.admin.update.success"))
                .data(data)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @PostMapping("/{id}/publish")
    public ApiResponse<BlogPostAdminResponse> publish(@PathVariable Long id) {
        BlogPostAdminResponse data = blogPostService.publish(id);
        return ApiResponse.<BlogPostAdminResponse>builder()
                .status("success")
                .message(i18nService.getMessage("response.blog_post.admin.publish.success"))
                .data(data)
                .timestamp(Instant.now())
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ADMIN_', 'ROLE_SUPER_ADMIN', 'ROLE_SUPER_ADMIN_')")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        blogPostService.delete(id);
        return ApiResponse.<Void>builder()
                .status("success")
                .message(i18nService.getMessage("response.blog_post.admin.delete.success"))
                .data(null)
                .timestamp(Instant.now())
                .build();
    }

    private static Long parseUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        try {
            return Long.parseLong(jwt.getSubject());
        } catch (NumberFormatException ex) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }
}
