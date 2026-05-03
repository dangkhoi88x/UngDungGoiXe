package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;

/**
 * Upload ảnh / tài liệu hồ sơ chủ xe lên Cloudinary (thay thế lưu local {@code /files/owner-vehicles/...}).
 * Vẫn hỗ trợ xóa file local cũ trong DB và asset Cloudinary của đúng cloud được cấu hình.
 */
@Service
@RequiredArgsConstructor
public class OwnerVehicleMediaService {

    private static final Set<String> IMAGE_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp"
    );

    private static final Set<String> DOC_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"
    );

    private final MediaService mediaService;
    private final LocalOwnerVehicleFileStorage localOwnerVehicleFileStorage;

    @Value("${cloudinary.cloud-name:}")
    private String cloudinaryCloudName;

    @Value("${app.owner-vehicle-upload.max-file-size-bytes:6291456}")
    private long maxBytesPerFile;

    public String storePhoto(Long userId, MultipartFile file) {
        validateOwnerPhoto(file);
        try {
            return mediaService.uploadOwnerAsset(
                    file,
                    "owner-vehicles/" + userId + "/photos",
                    false
            );
        } catch (IOException e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }
    }

    public String storeDocument(Long userId, MultipartFile file) {
        validateOwnerDocument(file);
        boolean pdf = isPdfContentType(file.getContentType());
        try {
            return mediaService.uploadOwnerAsset(
                    file,
                    "owner-vehicles/" + userId + "/documents",
                    pdf
            );
        } catch (IOException e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }
    }

    public boolean isManagedOwnerVehicleUrl(String publicUrl) {
        if (publicUrl == null || publicUrl.isBlank()) {
            return false;
        }
        String p = publicUrl.trim();
        if (p.startsWith("/files/owner-vehicles/")) {
            return true;
        }
        return isOurCloudinaryUrl(p);
    }

    public void deleteStoredFileIfPresent(String publicUrl) {
        if (publicUrl == null || publicUrl.isBlank()) {
            return;
        }
        String p = publicUrl.trim();
        if (p.startsWith("/files/")) {
            localOwnerVehicleFileStorage.deleteStoredFileIfPresent(publicUrl);
            return;
        }
        if (isOurCloudinaryUrl(p)) {
            mediaService.tryDestroyBySecureUrl(p);
        }
    }

    private boolean isOurCloudinaryUrl(String p) {
        if (cloudinaryCloudName == null || cloudinaryCloudName.isBlank()) {
            return false;
        }
        try {
            URI u = URI.create(p.replace(" ", "%20"));
            String scheme = u.getScheme();
            if (scheme == null
                    || (!"https".equalsIgnoreCase(scheme) && !"http".equalsIgnoreCase(scheme))) {
                return false;
            }
            if (!"res.cloudinary.com".equalsIgnoreCase(u.getHost())) {
                return false;
            }
            String path = u.getPath();
            if (path == null || !path.startsWith("/" + cloudinaryCloudName + "/")) {
                return false;
            }
            return path.contains("/image/upload/") || path.contains("/raw/upload/");
        } catch (Exception e) {
            return false;
        }
    }

    private void validateOwnerPhoto(MultipartFile file) {
        validateCommon(file, IMAGE_TYPES);
        String ct = file.getContentType();
        if (ct == null) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
        validateMagicBytes(file, ct.toLowerCase(Locale.ROOT));
    }

    private void validateOwnerDocument(MultipartFile file) {
        validateCommon(file, DOC_TYPES);
        String ct = file.getContentType();
        if (ct == null) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
        validateMagicBytes(file, ct.toLowerCase(Locale.ROOT));
    }

    private void validateCommon(MultipartFile file, Set<String> allowedTypes) {
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
    }

    private static boolean isPdfContentType(String contentType) {
        if (contentType == null) {
            return false;
        }
        return contentType.toLowerCase(Locale.ROOT).contains("pdf");
    }

    private void validateMagicBytes(MultipartFile file, String normalizedType) {
        byte[] head = new byte[16];
        int read;
        try (InputStream in = file.getInputStream()) {
            read = in.read(head);
        } catch (IOException e) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
        if (read <= 0) {
            throw new AppException(ErrorCode.FILE_UPLOAD_INVALID);
        }
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
        if (b.length < 12) {
            return false;
        }
        String riff = new String(Arrays.copyOfRange(b, 0, 4), StandardCharsets.US_ASCII);
        String webp = new String(Arrays.copyOfRange(b, 8, 12), StandardCharsets.US_ASCII);
        return "RIFF".equals(riff) && "WEBP".equals(webp);
    }

    private static boolean isPdf(byte[] b) {
        if (b.length < 5) {
            return false;
        }
        String sig = new String(Arrays.copyOfRange(b, 0, 5), StandardCharsets.US_ASCII);
        return "%PDF-".equals(sig);
    }
}
