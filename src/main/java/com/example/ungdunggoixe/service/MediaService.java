package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.dto.response.FileResponse;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import java.io.IOException;
import java.net.URI;

public interface MediaService {
    FileResponse uploadFiletoS3AWS(MultipartFile file) throws IOException;
    String uploadVehiclePhotoToS3(MultipartFile file, String folder) throws IOException;
    String uploadToS3AndGetUrl(MultipartFile file, String folder) throws IOException;
    void tryDeleteS3ByUrl(String publicUrl);
    boolean isOurS3Url(String publicUrl);
}
