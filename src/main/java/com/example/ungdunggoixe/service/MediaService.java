package com.example.ungdunggoixe.service;

import com.cloudinary.Cloudinary;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MediaService {
    private final Cloudinary cloudinary;

    @Value("${cloudinary.cloud-name:}")
    private String cloudinaryCloudName;

    public String upload(MultipartFile file) throws IOException {
        return upload(file, null);
    }

    /**
     * @param folder Cloudinary folder, e.g. {@code vehicles/12} (no leading slash)
     */
    public String upload(MultipartFile file, String folder) throws IOException {
        Map<String, Object> options = new HashMap<>();
        options.put("user_filename", true);
        options.put("unique_filename", false);
        options.put("overwrite", true);
        if (folder != null && !folder.isBlank()) {
            options.put("folder", folder.trim().replaceAll("^/+", ""));
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> uploadResult =
                cloudinary.uploader().upload(file.getBytes(), options);
        Object url = uploadResult.get("secure_url");
        if (url == null) {
            url = uploadResult.get("url");
        }
        return url != null ? url.toString() : "";
    }

    /**
     * Upload cho hồ sơ chủ xe: tên file duy nhất, folder cố định; PDF dùng {@code resource_type = raw}.
     */
    public String uploadOwnerAsset(MultipartFile file, String folder, boolean rawPdf) throws IOException {
        Map<String, Object> options = new HashMap<>();
        options.put("folder", folder.trim().replaceAll("^/+", ""));
        options.put("user_filename", true);
        options.put("unique_filename", true);
        options.put("overwrite", false);
        if (rawPdf) {
            options.put("resource_type", "raw");
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> uploadResult =
                cloudinary.uploader().upload(file.getBytes(), options);
        Object url = uploadResult.get("secure_url");
        if (url == null) {
            url = uploadResult.get("url");
        }
        return url != null ? url.toString() : "";
    }

    /**
     * Xóa asset theo {@code secure_url} (chỉ khi host đúng và cloud name khớp cấu hình).
     */
    public void tryDestroyBySecureUrl(String secureUrl) {
        if (secureUrl == null || secureUrl.isBlank() || cloudinaryCloudName.isBlank()) {
            return;
        }
        try {
            URI uri = URI.create(secureUrl.trim().replace(" ", "%20"));
            if (!"res.cloudinary.com".equalsIgnoreCase(uri.getHost())) {
                return;
            }
            String path = uri.getPath();
            if (path == null || !path.startsWith("/" + cloudinaryCloudName + "/")) {
                return;
            }
            ParsedDestroy target = parseDestroyTarget(path);
            if (target == null) {
                return;
            }
            Map<String, Object> opts = new HashMap<>();
            opts.put("resource_type", target.resourceType());
            cloudinary.uploader().destroy(target.publicId(), opts);
        } catch (Exception ignored) {
            // best-effort cleanup
        }
    }

    private ParsedDestroy parseDestroyTarget(String path) {
        String[] parts = path.split("/");
        int uploadIdx = -1;
        for (int i = 0; i < parts.length; i++) {
            if ("upload".equals(parts[i])) {
                uploadIdx = i;
                break;
            }
        }
        if (uploadIdx < 2) {
            return null;
        }
        String kind = parts[uploadIdx - 1];
        if (!"image".equals(kind) && !"raw".equals(kind)) {
            return null;
        }
        List<String> tail = new ArrayList<>();
        for (int i = uploadIdx + 1; i < parts.length; i++) {
            tail.add(parts[i]);
        }
        if (tail.isEmpty()) {
            return null;
        }
        if (tail.get(0).matches("^v\\d+$")) {
            tail.remove(0);
        }
        if (tail.isEmpty()) {
            return null;
        }
        String joined = String.join("/", tail);
        if ("raw".equals(kind)) {
            return new ParsedDestroy(joined, "raw");
        }
        String withoutExt = joined.replaceFirst("\\.[^.]+$", "");
        return new ParsedDestroy(withoutExt, "image");
    }

    private record ParsedDestroy(String publicId, String resourceType) {}
}
