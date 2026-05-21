package com.example.ungdunggoixe.controller;

import com.example.ungdunggoixe.common.BlogPostStatus;
import com.example.ungdunggoixe.dto.request.AdminBlogPostUpsertRequest;
import com.example.ungdunggoixe.dto.response.ApiResponse;
import com.example.ungdunggoixe.dto.response.BlogPostAdminResponse;
import com.example.ungdunggoixe.dto.response.PagedBlogPostAdminResponse;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.exception.ErrorCode;
import com.example.ungdunggoixe.service.BlogPostService;
import com.example.ungdunggoixe.service.I18nService;
import com.example.ungdunggoixe.service.MediaService;
import com.example.ungdunggoixe.util.JwtPrincipalUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping({"/admin/blog/posts", "/api/admin/blog/posts"})
@RequiredArgsConstructor
public class AdminBlogPostController {

    private final BlogPostService blogPostService;
    private final I18nService i18nService;
    private final MediaService mediaService;

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
        Long authorId = JwtPrincipalUtils.requireUserId(jwt);
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
    @PostMapping("/cover-image")
    public ApiResponse<Map<String, String>> uploadCoverImage(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt
    ) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
        Long adminId = JwtPrincipalUtils.requireUserId(jwt);
        String url;
        try {
            url = mediaService.uploadToS3AndGetUrl(file, "blog-posts/" + adminId + "/covers");
        } catch (IOException e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }
        return ApiResponse.<Map<String, String>>builder()
                .status("success")
                .message(i18nService.getMessage("response.blog_post.admin.upload_cover.success"))
                .data(Map.of("url", url))
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
}
