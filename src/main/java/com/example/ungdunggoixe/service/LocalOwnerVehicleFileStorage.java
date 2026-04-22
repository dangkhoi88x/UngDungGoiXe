package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.exception.AppException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class LocalOwnerVehicleFileStorage {

    private static final Set<String> IMAGE_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp"
    );

    private static final Set<String> DOC_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"
    );

    private final Path root;
    private final long maxBytesPerFile;

    public LocalOwnerVehicleFileStorage(
            @Value("${app.upload-dir:uploads}") String uploadDir,
            @Value("${app.owner-vehicle-upload.max-file-size-bytes:6291456}") long maxBytesPerFile
    ) {
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
        this.maxBytesPerFile = maxBytesPerFile;
    }

    public String storePhoto(Long userId, MultipartFile file) {
        return store(userId, file, "photo", IMAGE_TYPES);
    }

    public String storeDocument(Long userId, MultipartFile file) {
        return store(userId, file, "doc", DOC_TYPES);
    }

    private String store(Long userId, MultipartFile file, String prefix, Set<String> allowedTypes) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
        if (file.getSize() > maxBytesPerFile) {
            throw new AppException(ErrorCode.FILE_UPLOAD_TOO_LARGE);
        }
        String contentType = file.getContentType();
        if (contentType == null) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
        String normalizedType = contentType.toLowerCase(Locale.ROOT);
        if (!allowedTypes.contains(normalizedType)) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
        validateMagicBytes(file, normalizedType);
        String ext = extensionForMime(normalizedType);
        String filename = prefix + "-" + UUID.randomUUID() + ext;
        Path dir = root.resolve("owner-vehicles").resolve(String.valueOf(userId));
        try {
            Files.createDirectories(dir);
            Path target = dir.resolve(filename);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }
        return "/files/owner-vehicles/" + userId + "/" + filename;
    }

    public boolean isManagedOwnerVehicleUrl(String publicUrl) {
        if (publicUrl == null || publicUrl.isBlank()) return false;
        String p = publicUrl.trim();
        return p.startsWith("/files/owner-vehicles/");
    }

    public void deleteStoredFileIfPresent(String publicUrl) {
        if (publicUrl == null || publicUrl.isBlank()) return;
        String p = publicUrl.trim();
        if (!p.startsWith("/files/")) return;
        String rel = p.substring("/files/".length());
        if (rel.isEmpty() || rel.contains("..")) return;
        Path target = root.resolve(rel).normalize();
        if (!target.startsWith(root)) return;
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // best-effort cleanup
        }
    }

    private void validateMagicBytes(MultipartFile file, String normalizedType) {
        byte[] head = new byte[16];
        int read;
        try (InputStream in = file.getInputStream()) {
            read = in.read(head);
        } catch (IOException e) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
        if (read <= 0) throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        byte[] bytes = Arrays.copyOf(head, read);

        boolean ok;
        if (normalizedType.contains("jpeg") || normalizedType.contains("jpg")) {
            ok = isJpeg(bytes);
        } else if (normalizedType.contains("png")) {
            ok = isPng(bytes);
        } else if (normalizedType.contains("webp")) {
            ok = isWebp(bytes);
        } else if (normalizedType.contains("pdf")) {
            ok = isPdf(bytes);
        } else {
            ok = false;
        }
        if (!ok) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
    }

    private static boolean isJpeg(byte[] b) {
        return b.length >= 3
                && (b[0] & 0xFF) == 0xFF
                && (b[1] & 0xFF) == 0xD8
                && (b[2] & 0xFF) == 0xFF;
    }

    private static boolean isPng(byte[] b) {
        return b.length >= 8
                && (b[0] & 0xFF) == 0x89
                && b[1] == 'P'
                && b[2] == 'N'
                && b[3] == 'G'
                && (b[4] & 0xFF) == 0x0D
                && (b[5] & 0xFF) == 0x0A
                && (b[6] & 0xFF) == 0x1A
                && (b[7] & 0xFF) == 0x0A;
    }

    private static boolean isWebp(byte[] b) {
        if (b.length < 12) return false;
        String riff = new String(Arrays.copyOfRange(b, 0, 4), StandardCharsets.US_ASCII);
        String webp = new String(Arrays.copyOfRange(b, 8, 12), StandardCharsets.US_ASCII);
        return "RIFF".equals(riff) && "WEBP".equals(webp);
    }

    private static boolean isPdf(byte[] b) {
        if (b.length < 5) return false;
        String sig = new String(Arrays.copyOfRange(b, 0, 5), StandardCharsets.US_ASCII);
        return "%PDF-".equals(sig);
    }

    private static String extensionForMime(String mime) {
        if (mime.contains("pdf")) return ".pdf";
        if (mime.contains("png")) return ".png";
        if (mime.contains("webp")) return ".webp";
        return ".jpg";
    }
}

