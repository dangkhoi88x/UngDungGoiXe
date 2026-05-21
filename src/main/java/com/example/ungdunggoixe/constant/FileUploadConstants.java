package com.example.ungdunggoixe.constant;

import java.util.Set;

public final class FileUploadConstants {
    private FileUploadConstants() {
    }

    public static final Set<String> IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
    );

    public static final Set<String> IMAGE_AND_PDF_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "application/pdf"
    );
}
