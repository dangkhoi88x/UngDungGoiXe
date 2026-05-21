package com.example.ungdunggoixe.service;

import org.springframework.web.multipart.MultipartFile;

public interface OwnerVehicleMediaService {
    String storePhoto(Long userId, MultipartFile file);
    String storeDocument(Long userId, MultipartFile file);
    boolean isManagedOwnerVehicleUrl(String publicUrl);
    void deleteStoredFileIfPresent(String publicUrl);
}
