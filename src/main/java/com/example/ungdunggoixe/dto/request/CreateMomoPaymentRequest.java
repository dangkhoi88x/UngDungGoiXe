package com.example.ungdunggoixe.dto.request;

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
public class CreateMomoPaymentRequest {
    /** Optional. If null, backend will auto-generate. */
    private String orderId;
    /** Optional. If null, backend will auto-generate. */
    private String requestId;
    /** Required. Example: 150000 */
    private Long amount;
    /** Required. Example: Thanh toan booking #123 */
    private String orderInfo;
    /** Optional metadata string. */
    private String extraData;
}
