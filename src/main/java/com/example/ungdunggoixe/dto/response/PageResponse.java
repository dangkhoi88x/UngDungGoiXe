package com.example.ungdunggoixe.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.Collections;
import java.util.List;
@Getter
@Setter
@Builder
public class PageResponse<T> {
    @Builder.Default
    private List<T> content = Collections.emptyList();
    private long totalElements;
    private int totalPages;
    private int page;
    private int size;
}
