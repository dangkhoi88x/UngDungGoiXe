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
public class CreatePaymentRequest {
    /** Required | String | <=50 | e.g. MOMO */
    private String partnerCode;

    /** Required | String | <=50 | e.g. F8BBA842ECF85 */
    private String accessKey;

    /** Required | String | <=50 | unique per request | e.g. REQ_20260423_0001 */
    private String requestId;

    /** Required | String | <=50 | unique partner order id | e.g. ORD_123456 */
    private String orderId;

    /** Required | Long | >0 | e.g. 150000 */
    private Long amount;

    /** Required | String | <=255 | e.g. Thanh toan don #123 */
    private String orderInfo;

    /** Required | String(URL) | <=255 */
    private String redirectUrl;

    /** Required | String(URL) | <=255 */
    private String ipnUrl;

    /** Required | String | <=50 | e.g. captureWallet */
    private String requestType;

    /** Optional | String(base64/kv payload) | <=1000 */
    private String extraData;

    /** Required | HMAC_SHA256 hex | 64 chars */
    private String signature;

    /** Optional | String | vi/en */
    private String lang;
}
