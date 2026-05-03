package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.BlogPostStatus;
import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.dto.request.AdminBlogPostUpsertRequest;
import com.example.ungdunggoixe.dto.response.BlogPostAdminResponse;
import com.example.ungdunggoixe.dto.response.BlogPostPublicResponse;
import com.example.ungdunggoixe.dto.response.PagedBlogPostAdminResponse;
import com.example.ungdunggoixe.dto.response.PagedBlogPostResponse;
import com.example.ungdunggoixe.entity.BlogPost;
import com.example.ungdunggoixe.exception.AppException;
import com.example.ungdunggoixe.repository.BlogPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class BlogPostService {

    private static final Pattern NON_SLUG = Pattern.compile("[^a-z0-9]+");
    private static final Pattern MULTI_HYPHEN = Pattern.compile("-{2,}");
    private static final Set<String> PUBLIC_SORT_FIELDS =
            Set.of("publishedAt", "createdAt", "updatedAt", "title", "slug", "id");
    private static final Set<String> ADMIN_SORT_FIELDS =
            Set.of("publishedAt", "createdAt", "updatedAt", "title", "slug", "id", "status");

    private final BlogPostRepository blogPostRepository;

    @Transactional(readOnly = true)
    public PagedBlogPostResponse listPublished(String keyword, int page, int size, String sortBy, String sortDir) {
        Pageable pageable = buildPageable(page, size, sortBy, sortDir, PUBLIC_SORT_FIELDS, "publishedAt");
        String kw = normalizeKeyword(keyword);
        Page<BlogPost> result = blogPostRepository.findPublishedPage(kw, pageable);
        return toPublicPage(result);
    }

    @Transactional(readOnly = true)
    public BlogPostPublicResponse getPublishedBySlug(String rawSlug) {
        String slug = requireSlug(rawSlug);
        BlogPost post = blogPostRepository
                .findPublishedBySlug(slug)
                .orElseThrow(() -> new AppException(ErrorCode.BLOG_POST_NOT_FOUND));
        return toPublic(post);
    }

    @Transactional(readOnly = true)
    public PagedBlogPostAdminResponse listAdmin(
            BlogPostStatus status,
            String keyword,
            int page,
            int size,
            String sortBy,
            String sortDir
    ) {
        Pageable pageable = buildPageable(page, size, sortBy, sortDir, ADMIN_SORT_FIELDS, "updatedAt");
        String kw = normalizeKeyword(keyword);
        Page<BlogPost> result = blogPostRepository.findAdminPage(status, kw, pageable);
        return toAdminPage(result);
    }

    @Transactional(readOnly = true)
    public BlogPostAdminResponse getAdminById(Long id) {
        BlogPost post = blogPostRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BLOG_POST_NOT_FOUND));
        return toAdmin(post);
    }

    @Transactional
    public BlogPostAdminResponse create(AdminBlogPostUpsertRequest request, Long authorAdminId) {
        validateUpsert(request, true);
        String title = request.getTitle().trim();
        String baseSlug = request.getSlug() != null && !request.getSlug().isBlank()
                ? normalizeSlugInput(request.getSlug())
                : slugify(title);
        String slug = ensureUniqueSlug(baseSlug, null);

        BlogPostStatus status = request.getStatus() != null ? request.getStatus() : BlogPostStatus.DRAFT;
        Instant publishedAt = null;
        if (status == BlogPostStatus.PUBLISHED) {
            publishedAt = Instant.now();
        } else if (status == BlogPostStatus.ARCHIVED) {
            throw new AppException(ErrorCode.BLOG_POST_BODY_INVALID);
        }

        BlogPost entity = BlogPost.builder()
                .slug(slug)
                .title(title)
                .excerpt(trimToNull(request.getExcerpt()))
                .content(request.getContent().trim())
                .coverImageUrl(trimToNull(request.getCoverImageUrl()))
                .status(status)
                .publishedAt(publishedAt)
                .authorAdminId(authorAdminId)
                .build();
        BlogPost saved = blogPostRepository.save(entity);
        return toAdmin(saved);
    }

    @Transactional
    public BlogPostAdminResponse update(Long id, AdminBlogPostUpsertRequest request) {
        BlogPost post = blogPostRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BLOG_POST_NOT_FOUND));
        validateUpsert(request, false);

        String title = request.getTitle().trim();
        post.setTitle(title);

        if (request.getSlug() != null && !request.getSlug().isBlank()) {
            String normalized = normalizeSlugInput(request.getSlug());
            if (!normalized.equals(post.getSlug()) && blogPostRepository.existsBySlugAndIdNot(normalized, id)) {
                throw new AppException(ErrorCode.BLOG_POST_SLUG_ALREADY_EXISTS);
            }
            post.setSlug(normalized);
        }

        if (request.getExcerpt() != null) {
            post.setExcerpt(trimToNull(request.getExcerpt()));
        }
        post.setContent(request.getContent().trim());

        if (request.getCoverImageUrl() != null) {
            post.setCoverImageUrl(trimToNull(request.getCoverImageUrl()));
        }

        if (request.getStatus() != null) {
            BlogPostStatus next = request.getStatus();
            if (next == BlogPostStatus.PUBLISHED) {
                post.setStatus(BlogPostStatus.PUBLISHED);
                post.setPublishedAt(Instant.now());
            } else if (next == BlogPostStatus.DRAFT) {
                post.setStatus(BlogPostStatus.DRAFT);
                post.setPublishedAt(null);
            } else if (next == BlogPostStatus.ARCHIVED) {
                post.setStatus(BlogPostStatus.ARCHIVED);
                post.setPublishedAt(null);
            }
        }

        return toAdmin(blogPostRepository.save(post));
    }

    @Transactional
    public BlogPostAdminResponse publish(Long id) {
        BlogPost post = blogPostRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BLOG_POST_NOT_FOUND));
        if (post.getStatus() == BlogPostStatus.ARCHIVED) {
            throw new AppException(ErrorCode.BLOG_POST_PUBLISH_INVALID);
        }
        post.setStatus(BlogPostStatus.PUBLISHED);
        post.setPublishedAt(Instant.now());
        return toAdmin(blogPostRepository.save(post));
    }

    /** Soft-delete: move to ARCHIVED so slug stays reserved. */
    @Transactional
    public void delete(Long id) {
        BlogPost post = blogPostRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BLOG_POST_NOT_FOUND));
        post.setStatus(BlogPostStatus.ARCHIVED);
        post.setPublishedAt(null);
        blogPostRepository.save(post);
    }

    private static void validateUpsert(AdminBlogPostUpsertRequest request, boolean creating) {
        if (request == null) {
            throw new AppException(ErrorCode.BLOG_POST_BODY_INVALID);
        }
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new AppException(ErrorCode.BLOG_POST_BODY_INVALID);
        }
        if (request.getContent() == null || request.getContent().isBlank()) {
            throw new AppException(ErrorCode.BLOG_POST_BODY_INVALID);
        }
        if (request.getSlug() != null && !request.getSlug().isBlank()) {
            normalizeSlugInput(request.getSlug());
        }
    }

    private static String normalizeKeyword(String keyword) {
        if (keyword == null) return null;
        String t = keyword.trim();
        return t.isEmpty() ? null : t;
    }

    private static String requireSlug(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new AppException(ErrorCode.BLOG_POST_NOT_FOUND);
        }
        return normalizeSlugInput(raw);
    }

    private static String normalizeSlugInput(String raw) {
        String s = slugify(raw);
        if (s.isEmpty()) {
            throw new AppException(ErrorCode.BLOG_POST_BODY_INVALID);
        }
        if (s.length() > 200) {
            s = s.substring(0, 200).replaceAll("-+$", "");
        }
        return s;
    }

    /**
     * ASCII slug from arbitrary unicode (fold accents). Keeps [a-z0-9-].
     */
    private static String slugify(String input) {
        if (input == null) return "";
        String trimmed = input.trim().toLowerCase(Locale.ROOT);
        if (trimmed.isEmpty()) return "";
        String normalized = Normalizer.normalize(trimmed, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        normalized = normalized.replace('đ', 'd');
        normalized = NON_SLUG.matcher(normalized).replaceAll("-");
        normalized = MULTI_HYPHEN.matcher(normalized).replaceAll("-");
        // Bỏ gạch đầu/cuối (regex trước đây "^-+|+-+$" sai: "+-+$" là + treo).
        normalized = normalized.replaceAll("^-+", "").replaceAll("-+$", "");
        return normalized;
    }

    private String ensureUniqueSlug(String base, Long excludeId) {
        String candidate = base;
        int i = 2;
        while (true) {
            boolean taken =
                    excludeId == null
                            ? blogPostRepository.existsBySlug(candidate)
                            : blogPostRepository.existsBySlugAndIdNot(candidate, excludeId);
            if (!taken) {
                return candidate;
            }
            candidate = base + "-" + i;
            i++;
            if (candidate.length() > 215) {
                candidate = candidate.substring(0, 215).replaceAll("-+$", "");
            }
        }
    }

    private static Pageable buildPageable(
            int page,
            int size,
            String sortBy,
            String sortDir,
            Set<String> allowed,
            String defaultSort
    ) {
        int p = Math.max(0, page);
        int s = Math.min(50, Math.max(1, size));
        String field = allowed.contains(sortBy) ? sortBy : defaultSort;
        Sort.Direction direction =
                "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return PageRequest.of(p, s, Sort.by(direction, field));
    }

    private static String trimToNull(String v) {
        if (v == null) return null;
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }

    private static BlogPostPublicResponse toPublic(BlogPost b) {
        return BlogPostPublicResponse.builder()
                .id(b.getId())
                .slug(b.getSlug())
                .title(b.getTitle())
                .excerpt(b.getExcerpt())
                .content(b.getContent())
                .coverImageUrl(b.getCoverImageUrl())
                .publishedAt(b.getPublishedAt())
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .build();
    }

    private static BlogPostAdminResponse toAdmin(BlogPost b) {
        return BlogPostAdminResponse.builder()
                .id(b.getId())
                .slug(b.getSlug())
                .title(b.getTitle())
                .excerpt(b.getExcerpt())
                .content(b.getContent())
                .coverImageUrl(b.getCoverImageUrl())
                .status(b.getStatus())
                .publishedAt(b.getPublishedAt())
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .authorAdminId(b.getAuthorAdminId())
                .build();
    }

    private static PagedBlogPostResponse toPublicPage(Page<BlogPost> page) {
        return PagedBlogPostResponse.builder()
                .content(page.getContent().stream().map(BlogPostService::toPublic).toList())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .page(page.getNumber())
                .size(page.getSize())
                .build();
    }

    private static PagedBlogPostAdminResponse toAdminPage(Page<BlogPost> page) {
        return PagedBlogPostAdminResponse.builder()
                .content(page.getContent().stream().map(BlogPostService::toAdmin).toList())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .page(page.getNumber())
                .size(page.getSize())
                .build();
    }
}
