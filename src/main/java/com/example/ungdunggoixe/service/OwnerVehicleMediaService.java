package com.example.ungdunggoixe.service;

import com.example.ungdunggoixe.common.ErrorCode;
import com.example.ungdunggoixe.exception.AppException;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;

public interface OwnerVehicleMediaService {
    String storePhoto(Long userId, MultipartFile file);
    String storeDocument(Long userId, MultipartFile file);
    boolean isManagedOwnerVehicleUrl(String publicUrl);
    void deleteStoredFileIfPresent(String publicUrl);
}
