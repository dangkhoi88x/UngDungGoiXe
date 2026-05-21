package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.BlogPostStatus;
import com.example.ungdunggoixe.dto.request.AdminBlogPostUpsertRequest;
import com.example.ungdunggoixe.dto.response.BlogPostAdminResponse;
import com.example.ungdunggoixe.dto.response.BlogPostPublicResponse;
import com.example.ungdunggoixe.dto.response.PagedBlogPostAdminResponse;
import com.example.ungdunggoixe.dto.response.PagedBlogPostResponse;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

public interface BlogPostService {
    Pattern NON_SLUG = Pattern.compile("[^a-z0-9]+");
    Pattern MULTI_HYPHEN = Pattern.compile("-{2,}");

    static String toPublishedSlugCacheKey(String rawSlug) {
        if (rawSlug == null || rawSlug.isBlank()) {
            return "";
        }
        return normalizeSlugInput(rawSlug);
    }

    private static String normalizeSlugInput(String raw) {
        String s = slugify(raw);
        if (s.isEmpty()) {
            return "";
        }
        if (s.length() > 200) {
            s = s.substring(0, 200).replaceAll("-+$", "");
        }
        return s;
    }

    private static String slugify(String input) {
        if (input == null) return "";
        String trimmed = input.trim().toLowerCase(Locale.ROOT);
        if (trimmed.isEmpty()) return "";
        String normalized = Normalizer.normalize(trimmed, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        normalized = normalized.replace('đ', 'd');
        normalized = NON_SLUG.matcher(normalized).replaceAll("-");
        normalized = MULTI_HYPHEN.matcher(normalized).replaceAll("-");
        normalized = normalized.replaceAll("^-+", "").replaceAll("-+$", "");
        return normalized;
    }

    PagedBlogPostResponse listPublished(String keyword, int page, int size, String sortBy, String sortDir);
    BlogPostPublicResponse getPublishedBySlug(String rawSlug);
    PagedBlogPostAdminResponse listAdmin( BlogPostStatus status, String keyword, int page, int size, String sortBy, String sortDir );
    BlogPostAdminResponse getAdminById(Long id);
    BlogPostAdminResponse create(AdminBlogPostUpsertRequest request, Long authorAdminId);
    BlogPostAdminResponse update(Long id, AdminBlogPostUpsertRequest request);
    BlogPostAdminResponse publish(Long id);
    void delete(Long id);
}
