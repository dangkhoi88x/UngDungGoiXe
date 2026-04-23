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
public class CreatePaymentResponse {
    /** Required | String | <=50 | e.g. MOMO */
    private String partnerCode;

    /** Required | String | <=50 */
    private String requestId;

    /** Required | String | <=50 */
    private String orderId;

    /** Required | int | e.g. 0 success */
    private Integer resultCode;

    /** Required | String | <=255 */
    private String message;

    /** Optional | String(URL) | <=500 */
    private String payUrl;

    /** Optional | String(URL) | <=500 */
    private String deeplink;

    /** Optional | String | <=2000 */
    private String qrCodeUrl;

    /** Optional | Long | unix ms */
    private Long responseTime;

    /** Optional | String | <=255 */
    private String extraData;

    /** Optional | HMAC_SHA256 hex */
    private String signature;
}
