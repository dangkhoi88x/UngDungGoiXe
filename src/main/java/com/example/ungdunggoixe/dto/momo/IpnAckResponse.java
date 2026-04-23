package com.example.ungdunggoixe.dto.momo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IpnAckResponse {
    /**
     * MoMo IPN acknowledge code:
     * 0 = success/accepted, MoMo should stop retrying.
     * 1001 = invalid request/signature, MoMo may retry based on policy.
     */
    private Integer resultCode;
    private String message;
}
