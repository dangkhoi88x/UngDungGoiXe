package com.example.ungdunggoixe.dto.response;

import lombok.*;

@Getter
@Setter
@RequiredArgsConstructor
@AllArgsConstructor
@Builder
public class FileResponse {
    private String key;
    private String fileName;
    private String fileType;
    private long fileSize;
    private String url;

}
