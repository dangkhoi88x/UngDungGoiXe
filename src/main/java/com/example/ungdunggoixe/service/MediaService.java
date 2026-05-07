package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.dto.response.FileResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.net.URI;

@Service
@RequiredArgsConstructor
public class  MediaService {
    private final S3Client s3Client;
    @Value("${aws.s3.bucket}")
    private String bucketName;
    @Value("${aws.region.static}")
    private String region;

    public FileResponse uploadFiletoS3AWS(MultipartFile file) throws IOException {
        String key = uploadToS3(file, null);
        return FileResponse.builder()
                .key(key)
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .url(buildS3Url(key))
                .build();
    }

    public String uploadVehiclePhotoToS3(MultipartFile file, String folder) throws IOException {
        String key = uploadToS3(file, folder);
        return buildS3Url(key);
    }

    public String uploadToS3AndGetUrl(MultipartFile file, String folder) throws IOException {
        String key = uploadToS3(file, folder);
        return buildS3Url(key);
    }

    private String uploadToS3(MultipartFile file, String folder) throws IOException {
        String key = generateKeyS3(file.getOriginalFilename(), folder);
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(file.getContentType())
                .build();
        RequestBody requestBody = RequestBody.fromInputStream(file.getInputStream(), file.getSize());
        s3Client.putObject(request, requestBody);
        return key;
    }

    private String buildS3Url(String key) {
        return "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + key;
    }

    public void tryDeleteS3ByUrl(String publicUrl) {
        String key = extractOurS3Key(publicUrl);
        if (key == null || key.isBlank()) {
            return;
        }
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build());
        } catch (Exception ignored) {
            // best-effort cleanup
        }
    }

    public boolean isOurS3Url(String publicUrl) {
        return extractOurS3Key(publicUrl) != null;
    }

    private String generateKeyS3(String fileName, String folder) {
        String cleanFolder = folder == null ? "" : folder.trim().replaceAll("^/+", "").replaceAll("/+$", "");
        String safeName = (fileName == null || fileName.isBlank()) ? "file" : fileName.trim();
        int dotIdx = safeName.lastIndexOf('.');
        String baseName = dotIdx > 0 ? safeName.substring(0, dotIdx) : safeName;
        String extension = dotIdx > 0 ? safeName.substring(dotIdx) : "";
        String generatedName = baseName + "-" + System.currentTimeMillis() + extension;
        if (cleanFolder.isBlank()) {
            return generatedName;
        }
        return cleanFolder + "/" + generatedName;
    }

    private String extractOurS3Key(String publicUrl) {
        if (publicUrl == null || publicUrl.isBlank()
                || bucketName == null || bucketName.isBlank()
                || region == null || region.isBlank()) {
            return null;
        }
        try {
            URI uri = URI.create(publicUrl.trim().replace(" ", "%20"));
            if (!"https".equalsIgnoreCase(uri.getScheme())) {
                return null;
            }
            String expectedHost = bucketName + ".s3." + region + ".amazonaws.com";
            if (!expectedHost.equalsIgnoreCase(uri.getHost())) {
                return null;
            }
            String path = uri.getPath();
            if (path == null || path.length() <= 1) {
                return null;
            }
            return path.substring(1);
        } catch (Exception e) {
            return null;
        }
    }




}
