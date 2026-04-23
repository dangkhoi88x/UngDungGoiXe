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
public class IpnCallbackRequest {
    /** Required | String | <=50 */
    private String partnerCode;

    /** Required | String | <=50 */
    private String orderId;

    /** Required | String | <=50 */
    private String requestId;

    /** Required | Long | >0 */
    private Long amount;

    /** Required | String | <=255 */
    private String orderInfo;

    /** Required | String | <=50 */
    private String requestType;

    /** Optional | String | <=50 | e.g. momo_wallet */
    private String orderType;

    /** Optional | String | <=50 | e.g. qr/app */
    private String payType;

    /** Optional | String | <=1000 */
    private String extraData;

    /** Required | Long | MoMo trans id */
    private Long transId;

    /** Required | int | 0 = success */
    private Integer resultCode;

    /** Required | String | <=255 */
    private String message;

    /** Optional | Long | unix ms */
    private Long responseTime;

    /** Required | HMAC_SHA256 hex | 64 chars */
    private String signature;
}
