package com.example.ungdunggoixe.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagedVehicleResponse {
    private List<CreateVehicleResponse> content;
    private long totalElements;
    private int totalPages;
    private int page;
    private int size;
}
