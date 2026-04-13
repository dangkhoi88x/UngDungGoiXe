package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.exception.AppException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class LocalUserDocumentStorage {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp"
    );

    private final Path root;

    public LocalUserDocumentStorage(@Value("${app.upload-dir:uploads}") String uploadDir) {
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    /**
     * Lưu file và trả về đường dẫn public (bắt đầu bằng /files/...) để lưu vào DB.
     */
    public String storeUserImage(Long userId, MultipartFile file, String prefix) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.DOCUMENT_SUBMISSION_INVALID);
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new AppException(ErrorCode.DOCUMENT_SUBMISSION_INVALID);
        }
        String ext = extensionForMime(contentType);
        String filename = prefix + "-" + UUID.randomUUID() + ext;
        Path dir = root.resolve("users").resolve(String.valueOf(userId));
        try {
            Files.createDirectories(dir);
            Path target = dir.resolve(filename);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }
        return "/files/users/" + userId + "/" + filename;
    }

    /**
     * Xóa file đã lưu theo URL public trong DB (chỉ chấp nhận tiền tố {@code /files/} và nằm dưới {@code root}).
     */
    public void deleteStoredFileIfPresent(String publicUrl) {
        if (publicUrl == null || publicUrl.isBlank()) {
            return;
        }
        String p = publicUrl.trim();
        if (!p.startsWith("/files/")) {
            return;
        }
        String rel = p.substring("/files/".length());
        if (rel.isEmpty() || rel.contains("..")) {
            return;
        }
        Path target = root.resolve(rel).normalize();
        if (!target.startsWith(root)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // best-effort cleanup
        }
    }

    private static String extensionForMime(String mime) {
        String m = mime.toLowerCase(Locale.ROOT);
        if (m.contains("png")) return ".png";
        if (m.contains("webp")) return ".webp";
        return ".jpg";
    }
}
